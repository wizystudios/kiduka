import { BarcodeFormat, BinaryBitmap, DecodeHintType, HTMLCanvasElementLuminanceSource, HybridBinarizer, MultiFormatReader } from '@zxing/library';

export const SCAN_HELP_AFTER_MS = 3000;
export const SCAN_INTERVAL_MS = 40;
/** Fallback decodes only the centre aiming box, downscaled, so slow phones still read in well under a second. */
const CROP_WIDTH = 640;
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
  private fallbackOn = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | undefined;

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
      if (this.stopped || this.fallbackOn) return;
      this.fallbackOn = true;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
      const zx = new MultiFormatReader();
      zx.setHints(hints);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const tick = () => {
        if (this.stopped || !ctx) return;
        const w = video.videoWidth, h = video.videoHeight;
        if (video.readyState >= 2 && w && h) {
          // Centre strip matching the on-screen box: wide for 1D barcodes.
          const sw = Math.round(w * 0.85), sh = Math.round(Math.min(h * 0.6, sw * 0.6));
          const scale = Math.min(1, CROP_WIDTH / sw);
          canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
          ctx.drawImage(video, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
          try {
            const r = zx.decodeWithState(new BinaryBitmap(new HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas))));
            if (!this.stopped) callback({ getText: () => r.getText(), getFormat: () => BarcodeFormat[r.getBarcodeFormat()].toLowerCase() });
          } catch { /* nothing in this frame */ }
        }
        if (!this.stopped) this.fallbackTimer = setTimeout(tick, SCAN_INTERVAL_MS);
      };
      tick();
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
    clearTimeout(this.fallbackTimer);
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