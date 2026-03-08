import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Copy, ExternalLink, Package, Phone, MapPin, ArrowUpRight, ArrowLeft } from 'lucide-react';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <SokoniLogo size="sm" />
        <h2 className="font-bold text-sm flex items-center gap-2 text-green-600">
          <Check className="h-4 w-4" />
          Oda Imepokewa!
        </h2>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground">{dateStr} • {timeStr}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 relative min-h-0">
          {/* Center Divider */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              <div className="absolute top-1/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-1/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
              <div className="absolute top-2/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-2/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
            <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT — Tracking & Details */}
          <div className="flex-1 lg:pr-8 space-y-4">
            <Card className="rounded-3xl">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Namba za Ufuatiliaji
                </h4>
                {trackingCodes.map((code, i) => (
                  <div key={i} className="flex items-center justify-between bg-primary/5 rounded-2xl p-3">
                    <code className="font-mono text-sm font-bold text-primary">{code}</code>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)}>
                        {copied === code ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => goToTracking(code)}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /><span>{customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /><span>{deliveryAddress}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Items & Actions */}
          <div className="flex-1 lg:pl-8 space-y-4">
            <Card className="rounded-3xl">
              <CardContent className="p-4 space-y-3">
                <h5 className="font-semibold text-xs text-muted-foreground uppercase">Bidhaa</h5>
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded-2xl">
                    <span className="truncate mr-2">{item.product_name} ×{item.quantity}</span>
                    <span className="whitespace-nowrap font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>Jumla</span>
                  <span className="text-primary">TSh {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Malipo:</span>
                  <Badge variant="secondary" className="text-xs">{paymentMethod === 'cash_on_delivery' ? 'Lipa Upokeapo' : paymentMethod}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button onClick={() => goToTracking(trackingCodes[0])} className="w-full" size="lg">
                <Package className="h-4 w-4 mr-2" />
                Fuatilia Oda Yangu
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full" size="lg">
                Endelea Kununua
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
