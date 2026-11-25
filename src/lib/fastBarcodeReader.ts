import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';

export const SCAN_HELP_AFTER_MS = 3000;
export const SCAN_INTERVAL_MS = 60;
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
type ScanResult = { getText: () => string; getFormat?: () => string };
type NativeDetector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string; format?: string }[]> };
type NativeConstructor = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

/** No minimum wait: use the browser decoder first, with a portable fallback. */
export class FastBarcodeReader {
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private fallback: BrowserMultiFormatReader | undefined;

  async decodeFromStream(stream: MediaStream, video: HTMLVideoElement,
    callback: (result?: ScanResult, error?: unknown) => void) {
    const Native = (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor }).BarcodeDetector;
    let detector: NativeDetector | undefined;
    // Never wait indefinitely for native capability discovery.
    if (Native) {
      try {
        const formats = await Promise.race([
          Native.getSupportedFormats(),
          new Promise<string[]>(resolve => setTimeout(() => resolve([]), 200)),
        ]);
        const supported = FORMATS.filter(f => formats.includes(f));
        if (supported.length) detector = new Native({ formats: supported });
      } catch { /* Unsupported native detector: use ZXing. */ }
    }
    if (this.stopped) return;
    const startFallback = () => {
      if (this.stopped || this.fallback) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
      this.fallback = new BrowserMultiFormatReader(hints, SCAN_INTERVAL_MS);
      void this.fallback.decodeFromStream(stream, video, (result, error) => {
        if (!this.stopped) callback(result ? {
          getText: () => result.getText(),
          getFormat: () => BarcodeFormat[result.getBarcodeFormat()].toLowerCase(),
        } : undefined, error);
      }).catch(error => { if (!this.stopped) callback(undefined, error); });
    };
    if (!detector) { startFallback(); return; }
    // Some native implementations cannot read every format; don't strand those phones.
    this.timer = setTimeout(startFallback, 500);
    const native = detector;
    const read = async () => {
      if (this.stopped) return;
      if (video.readyState >= 2) {
        try {
          const results = await native.detect(video);
          if (this.stopped) return;
          const result = results[0];
          if (result?.rawValue) callback({ getText: () => result.rawValue, getFormat: () => result.format ?? '' });
        } catch { startFallback(); }
      }
      if (!this.stopped) this.nativeTimer = setTimeout(() => void read(), SCAN_INTERVAL_MS);
    };
    void read();
  }

  private nativeTimer: ReturnType<typeof setTimeout> | undefined;
  reset() {
    this.stopped = true;
    clearTimeout(this.timer);
    clearTimeout(this.nativeTimer);
    this.fallback?.reset();
  }
}

export function isValidBarcode(code: string, format?: string) {
  const value = code.trim();
  if (!value) return false;
  // Decoded QR/Code128/UPC-E payloads don't follow EAN check-digit rules.
  if (format && !['ean_13', 'ean_8', 'upc_a'].includes(format)) return true;
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return value.length >= 4;
  const digits = value.split('').map(Number);
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}