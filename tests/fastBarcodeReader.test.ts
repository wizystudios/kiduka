import { describe, expect, it, afterEach } from 'bun:test';
import { FastBarcodeReader, isValidBarcode } from '../src/lib/fastBarcodeReader';

afterEach(() => { Reflect.deleteProperty(globalThis, 'BarcodeDetector'); });

describe('shared barcode decoder', () => {
  it('accepts a real EAN and rejects a damaged check digit', () => {
    expect(isValidBarcode('5449000000996')).toBe(true);
    expect(isValidBarcode('5449000000997')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
  });
  it('does not impose EAN check digits on Code128 or short QR payloads', () => {
    expect(isValidBarcode('5449000000997', 'code_128')).toBe(true);
    expect(isValidBarcode('abc', 'qr_code')).toBe(true);
    expect(isValidBarcode('5449000000997', 'ean_13')).toBe(false);
  });
  it('delivers native reads without a one-second waiting gate', async () => {
    class Detector {
      static async getSupportedFormats() { return ['ean_13']; }
      async detect() { return [{ rawValue: '5449000000996' }]; }
    }
    Object.defineProperty(globalThis, 'BarcodeDetector', { value: Detector, configurable: true });
    const reader = new FastBarcodeReader();
    const started = performance.now();
    let result = '';
    await reader.decodeFromStream({} as MediaStream, { readyState: 2 } as HTMLVideoElement, value => {
      result = value?.getText() ?? ''; reader.reset();
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(result).toBe('5449000000996');
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('does not publish a read which arrives after closing', async () => {
    let complete: ((value: { rawValue: string }[]) => void) | undefined;
    class Detector {
      static async getSupportedFormats() { return ['ean_13']; }
      detect() { return new Promise<{ rawValue: string }[]>(resolve => { complete = resolve; }); }
    }
    Object.defineProperty(globalThis, 'BarcodeDetector', { value: Detector, configurable: true });
    const reader = new FastBarcodeReader();
    let calls = 0;
    await reader.decodeFromStream({} as MediaStream, { readyState: 2 } as HTMLVideoElement, () => { calls++; });
    reader.reset();
    complete?.([{ rawValue: '5449000000996' }]);
    await Promise.resolve();
    expect(calls).toBe(0);
  });
});