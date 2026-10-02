import { forwardRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ShoppingBag } from 'lucide-react';
import { PaymentBrandIcon, paymentBrandLabel } from '@/components/PaymentBrandIcon';

interface LipaNambaCardProps {
  businessName: string;
  network: string;
  lipaNamba: string;
  accountName?: string | null;
  amount?: number;
  qrValue: string;
  /** Official QR image uploaded by the owner. When absent, the generated QR only carries the number. */
  qrImageUrl?: string | null;
}

/** Branded Lipa Namba card — same visual language as the receipt (BusinessDocument). */
export const LipaNambaCard = forwardRef<HTMLDivElement, LipaNambaCardProps>(
  ({ businessName, network, lipaNamba, accountName, amount, qrValue, qrImageUrl }, ref) => (
    <div ref={ref} className="mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl bg-primary shadow-lg">
      <div className="px-5 pb-6 pt-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/95">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{businessName}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Lipa Namba · Kiduka</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-background/15 px-3 py-1.5">
          <PaymentBrandIcon network={network} size="sm" />
          <span className="text-sm font-semibold">{paymentBrandLabel(network)}</span>
        </div>
        {typeof amount === 'number' && amount > 0 && (
          <p className="mt-3 text-2xl font-black">TSh {amount.toLocaleString()}</p>
        )}
      </div>
      <div className="rounded-t-3xl bg-card px-5 pb-5 pt-5 text-center text-card-foreground">
        <div className="mx-auto w-fit rounded-2xl border border-border bg-background p-3">
          {qrImageUrl ? (
            <img src={qrImageUrl} crossOrigin="anonymous" alt="QR rasmi ya malipo" className="h-[200px] w-[200px] object-contain" />
          ) : (
            <QRCodeCanvas value={qrValue} size={200} level="M" includeMargin={false} />
          )}
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">Lipa Namba</p>
        <p className="font-mono text-3xl font-black tracking-wide">{lipaNamba}</p>
        {accountName && <p className="mt-1 text-sm font-semibold text-muted-foreground">{accountName}</p>}
        <div className="mt-4 border-t border-dashed border-border pt-3">
          <p className="text-[11px] text-muted-foreground">
            {qrImageUrl ? 'Changanua QR au ingiza Lipa Namba kulipa' : 'Ingiza Lipa Namba kwenye simu yako kulipa'}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Powered by Kiduka</p>
        </div>
      </div>
    </div>
  )
);
LipaNambaCard.displayName = 'LipaNambaCard';
