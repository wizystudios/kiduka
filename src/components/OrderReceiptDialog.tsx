import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, ExternalLink, Package, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SokoniLogo } from './SokoniLogo';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  trackingCodes: string[];
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
}

export const OrderReceiptDialog = ({
  open, onClose, trackingCodes, customerPhone, deliveryAddress, items, totalAmount, paymentMethod
}: OrderReceiptDialogProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success('Namba imekopwa!');
      setTimeout(() => setCopied(null), 2000);
    } catch { toast.error('Imeshindwa kukopi'); }
  };

  const goToTracking = (code: string) => {
    onClose();
    navigate(`/track-order?code=${code}&phone=${encodeURIComponent(customerPhone)}`);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 text-center border-b border-border">
          <SokoniLogo />
          <h2 className="text-lg font-bold mt-3 flex items-center justify-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Oda Imepokewa!
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{dateStr} • {timeStr}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 relative">
          {/* Center Divider */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30" />
          </div>

          {/* LEFT — Tracking & Details */}
          <div className="flex-1 p-5 space-y-3">
            {/* Tracking Codes */}
            <div className="bg-primary/10 rounded-2xl p-3 space-y-2">
              <h4 className="font-semibold text-xs flex items-center gap-2">
                <Package className="h-4 w-4" />
                Namba za Ufuatiliaji
              </h4>
              {trackingCodes.map((code, i) => (
                <div key={i} className="flex items-center justify-between bg-background rounded-xl p-2">
                  <code className="font-mono text-sm font-bold text-primary">{code}</code>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)} className="h-7 px-2 rounded-xl">
                      {copied === code ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => goToTracking(code)} className="h-7 px-2 rounded-xl">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" /><span>{customerPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" /><span>{deliveryAddress}</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Items */}
          <div className="flex-1 p-5 border-t lg:border-t-0 lg:border-l border-border space-y-2">
            <h5 className="font-semibold text-xs text-muted-foreground">BIDHAA</h5>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="truncate mr-2">{item.product_name} ×{item.quantity}</span>
                <span className="whitespace-nowrap font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Jumla</span>
              <span className="text-primary">TSh {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-muted-foreground">Malipo:</span>
              <Badge variant="secondary" className="rounded-xl text-xs">{paymentMethod === 'cash_on_delivery' ? 'Lipa Upokeapo' : paymentMethod}</Badge>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex flex-col gap-2">
          <Button onClick={() => goToTracking(trackingCodes[0])} className="w-full rounded-2xl">
            <Package className="h-4 w-4 mr-2" />
            Fuatilia Oda Yangu
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full rounded-2xl">
            Endelea Kununua
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
