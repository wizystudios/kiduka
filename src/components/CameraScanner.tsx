import { useEffect, useRef, useState } from 'react';
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CameraOff, Keyboard } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
}

const NOT_FOUND_AFTER_MS = 12000;

/** EAN/UPC check digit; other formats are trusted to the decoder. */
export const isValidBarcode = (code: string) => {
  const c = code.trim();
  if (!c) return false;
  if (!/^\d+$/.test(c) || ![8, 12, 13, 14].includes(c.length)) return c.length >= 4;
  const digits = c.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
};

/** Full-screen live scanner using the same engine and look as the sales scanner. */
export const CameraScanner = ({ onScan, onClose, isOpen, title = 'Scan barcode ya bidhaa' }: CameraScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'active' | 'slow' | 'error'>('starting');
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, 80);
    setStatus('starting'); setMessage(null);
    const slowTimer = window.setTimeout(() => { if (!cancelled) setStatus('slow'); }, NOT_FOUND_AFTER_MS);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Unsupported' });
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled || !videoRef.current) return;
        const [track] = stream.getVideoTracks();
        try {
          const caps = track.getCapabilities?.() as any;
          if (caps?.focusMode?.includes?.('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
        } catch { /* focus optional */ }
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
        setStatus('active');
        await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (cancelled || !result) return;
          const code = result.getText().trim();
          if (!isValidBarcode(code)) { setMessage('Barcode hii haisomeki vizuri. Jaribu tena au iandike.'); return; }
          cancelled = true;
          if (navigator.vibrate) navigator.vibrate(80);
          onScan(code);
        });
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.name === 'NotAllowedError' ? 'Ruhusu kamera kwenye mipangilio ya browser, kisha jaribu tena.'
          : 'Kamera haikufunguka. Funga app nyingine zinazotumia kamera, kisha jaribu tena.');
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      reader.reset();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [isOpen, attempt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
        <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-3">
          <Button size="icon" variant="secondary" aria-label="Funga" className="h-11 w-11 rounded-full" onClick={onClose}><ArrowLeft className="h-5 w-5" /></Button>
          <p className="text-sm font-medium text-background">{title}</p>
        </div>
        {status !== 'error' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-72 rounded-3xl border-4 border-success" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center text-background">
            <CameraOff className="h-10 w-10" />
            <p className="text-sm">{message}</p>
            <Button className="rounded-full" onClick={() => setAttempt(a => a + 1)}>Jaribu tena</Button>
          </div>
        )}
      </div>
      <div className="space-y-2 bg-background p-4 text-center">
        <p className="text-sm text-foreground">
          {status === 'starting' ? 'Inafungua kamera…'
            : message ?? (status === 'slow' ? 'Barcode haijaonekana. Sogeza simu karibu, weka mwanga, au iandike.' : 'Weka barcode ndani ya kisanduku cha kijani.')}
        </p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = manual.trim(); if (c) onScan(c); }}>
          <Input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="Au andika barcode hapa"
            className="h-10 rounded-2xl text-sm" autoFocus={status === 'slow' || status === 'error'} />
          <Button type="submit" className="h-10 rounded-full px-4" disabled={!manual.trim()}><Keyboard className="mr-1 h-4 w-4" />Tumia</Button>
        </form>
      </div>
    </div>
  );
};
