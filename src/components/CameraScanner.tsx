import { useEffect, useRef, useState } from 'react';
import { FastBarcodeReader, isValidBarcode, SCAN_HELP_AFTER_MS } from '@/lib/fastBarcodeReader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CameraOff, Keyboard } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
}

export { isValidBarcode } from '@/lib/fastBarcodeReader';

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
    const reader = new FastBarcodeReader();
    setStatus('starting'); setMessage(null);
    let slowTimer: number | undefined;
    const startupTimer = window.setTimeout(() => {
      if (!cancelled) setMessage('Kamera bado inafunguka. Unaweza kuandika barcode chini.');
    }, SCAN_HELP_AFTER_MS);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Unsupported' });
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled || !videoRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        const [track] = stream.getVideoTracks();
        try {
          const caps = track.getCapabilities?.() as any;
          if (caps?.focusMode?.includes?.('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
        } catch { /* focus optional */ }
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
        if (cancelled) return;
        window.clearTimeout(startupTimer);
        setMessage(null);
        setStatus('active');
        slowTimer = window.setTimeout(() => { if (!cancelled) setStatus('slow'); }, SCAN_HELP_AFTER_MS);
        await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (cancelled || !result) return;
          const code = result.getText().trim();
          if (!isValidBarcode(code, result.getFormat?.())) { setMessage('Barcode hii haisomeki vizuri. Jaribu tena au iandike.'); return; }
          cancelled = true;
          window.clearTimeout(slowTimer);
          reader.reset();
          stream?.getTracks().forEach(t => t.stop());
          if (navigator.vibrate) navigator.vibrate(80);
          onScan(code);
        });
      } catch (err: any) {
        if (cancelled) return;
        window.clearTimeout(startupTimer);
        window.clearTimeout(slowTimer);
        setStatus('error');
        setMessage(err?.name === 'NotAllowedError' ? 'Ruhusu kamera kwenye mipangilio ya browser, kisha jaribu tena.'
          : 'Kamera haikufunguka. Funga app nyingine zinazotumia kamera, kisha jaribu tena.');
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(startupTimer);
      reader.reset();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [isOpen, attempt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-12 bottom-16 z-[45] flex flex-col bg-foreground md:top-10 md:bottom-0 md:left-16">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-background/95 px-4 py-2">
          <Button size="icon" variant="secondary" aria-label="Funga" className="h-11 w-11 rounded-full" onClick={onClose}><ArrowLeft className="h-5 w-5" /></Button>
          <p className="text-sm font-medium text-foreground">{title}</p>
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
          {message ?? (status === 'starting' ? 'Inafungua kamera…'
            : status === 'slow' ? 'Bado haijasomeka. Weka mwanga au andika barcode chini.' : 'Elekeza kamera kwenye barcode.')}
        </p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = manual.trim(); if (c) onScan(c); }}>
          <Input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="Au andika barcode hapa"
            className="h-11 rounded-2xl text-base" aria-label="Andika barcode" />
          <Button type="submit" className="h-11 rounded-full px-4" disabled={!manual.trim()}><Keyboard className="mr-1 h-4 w-4" />Tumia</Button>
        </form>
      </div>
    </div>
  );
};
