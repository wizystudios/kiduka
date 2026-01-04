import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, ExternalLink, Package, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  open,
  onClose,
  trackingCodes,
  customerPhone,
  deliveryAddress,
  items,
  totalAmount,
  paymentMethod
}: OrderReceiptDialogProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success('Namba imekopwa!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Imeshindwa kukopi');
    }
  };

  const goToTracking = (code: string) => {
    onClose();
    navigate(`/track-order?code=${code}&phone=${encodeURIComponent(customerPhone)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Oda Imepokewa!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tracking Codes */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Namba za Ufuatiliaji
            </h4>
            <div className="space-y-2">
              {trackingCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between bg-background rounded-md p-2">
                  <code className="font-mono text-sm font-bold text-primary">{code}</code>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                      className="h-7 px-2"
                    >
                      {copied === code ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goToTracking(code)}
                      className="h-7 px-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tumia namba hii na namba yako ya simu kufuatilia oda yako
            </p>
          </div>

          {/* Order Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{customerPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{deliveryAddress}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border rounded-md p-3 space-y-2">
            <h5 className="font-semibold text-xs text-muted-foreground">BIDHAA</h5>
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.product_name} x{item.quantity}</span>
                <span>TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Jumla</span>
              <span className="text-primary">TSh {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Malipo:</span>
            <Badge variant="secondary">{paymentMethod}</Badge>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={() => goToTracking(trackingCodes[0])}
            className="w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            Fuatilia Oda Yangu
          </Button>
          <Button 
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Endelea Kununua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
