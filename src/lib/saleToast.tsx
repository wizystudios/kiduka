import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

/** Success message for a completed sale with a QR/link to the sale summary. */
export const saleSuccessToast = (saleId: string | null | undefined, total: number, title = 'Mauzo yamekamilika!') => {
  const url = saleId ? `${window.location.origin}/mauzo/${saleId}` : null;
  toast.success(title, {
    duration: 8000,
    description: (
      <div className="mt-1 flex items-center gap-3">
        {url && (
          <a href={url} aria-label="Fungua muhtasari wa mauzo" className="shrink-0 rounded-xl bg-background p-1.5">
            <QRCodeSVG value={url} size={64} />
          </a>
        )}
        <div className="text-xs">
          <p className="font-semibold">Jumla: TSh {Math.round(total || 0).toLocaleString()}</p>
          {url && <p className="opacity-80">Bonyeza QR kuona muhtasari kamili</p>}
        </div>
      </div>
    ),
    action: url ? { label: 'Fungua', onClick: () => window.location.assign(url) } : undefined,
  });
};
