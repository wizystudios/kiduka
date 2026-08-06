import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Share2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { BrandMark } from '@/components/BrandMark';
import { captureElementAsImage, createPdfFromImage, shareOrDownloadFile } from '@/utils/shareExport';
import { toast } from 'sonner';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoiceProps {
  customer_name: string;
  customer_phone?: string;
  items: InvoiceItem[];
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  invoice_number?: string;
  date?: string;
  notes?: string;
}

export const InvoiceGenerator = ({
  customer_name,
  customer_phone,
  items,
  total_amount,
  payment_method = 'cash',
  payment_status = 'paid',
  invoice_number,
  date,
  notes,
}: InvoiceProps) => {
  const { userProfile } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'pdf' | 'image' | null>(null);

  const invoiceNum = invoice_number || `INV-${Date.now().toString().slice(-8)}`;
  const invoiceDate = date || format(new Date(), 'dd/MM/yyyy');
  const businessName = userProfile?.business_name || userProfile?.full_name || 'Kiduka';

  const handlePrint = () => window.print();

  const exportAs = async (type: 'pdf' | 'image') => {
    if (!invoiceRef.current) return;
    setBusy(type);
    try {
      const capture = await captureElementAsImage(invoiceRef.current);
      const file =
        type === 'pdf'
          ? createPdfFromImage(capture, `${invoiceNum}.pdf`)
          : new File([capture.blob], `${invoiceNum}.png`, { type: 'image/png' });
      const result = await shareOrDownloadFile(file, `Ankara ${invoiceNum}`);
      toast.success(result === 'shared' ? 'Ankara imeshirikishwa' : 'Ankara imepakuliwa');
    } catch (e: any) {
      toast.error(e?.message || 'Imeshindikana kutengeneza ankara');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card ref={invoiceRef} className="rounded-3xl overflow-hidden bg-background print:shadow-none print:border-0">
        <CardContent className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b">
            <BrandMark title={businessName} subtitle="Ankara ya Mauzo" size="md" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Namba</p>
              <p className="font-mono text-sm font-bold">{invoiceNum}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{invoiceDate}</p>
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mteja</p>
              <p className="font-medium">{customer_name}</p>
              {customer_phone && <p className="text-xs text-muted-foreground">{customer_phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hali ya Malipo</p>
              <p className="font-medium">
                {payment_status === 'paid' ? 'Amelipa' : payment_status === 'partial' ? 'Nusu' : 'Hajalipa'}
              </p>
              <p className="text-xs text-muted-foreground">
                {payment_method === 'cash' ? 'Taslimu' : payment_method === 'mobile_money' ? 'Pesa za Simu' : 'Benki'}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Bidhaa</th>
                  <th className="text-center py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Idadi</th>
                  <th className="text-right py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Bei</th>
                  <th className="text-right py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Jumla</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2 pr-2">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{item.unit_price.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-muted/60 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">JUMLA</span>
            <span className="text-xl font-bold">TZS {total_amount.toLocaleString()}</span>
          </div>

          {notes && <p className="text-xs text-muted-foreground">{notes}</p>}

          <div className="text-center border-t pt-4">
            <p className="text-xs text-muted-foreground">Asante kwa biashara yako!</p>
            <p className="text-[10px] text-muted-foreground mt-1">Imetengenezwa na Kiduka</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="flex-1 rounded-full">
          <Printer className="h-4 w-4 mr-2" /> Chapisha
        </Button>
        <Button onClick={() => exportAs('image')} variant="outline" className="flex-1 rounded-full" disabled={busy !== null}>
          {busy === 'image' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />} Picha
        </Button>
        <Button onClick={() => exportAs('pdf')} className="flex-1 rounded-full" disabled={busy !== null}>
          {busy === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} PDF
        </Button>
      </div>
    </div>
  );
};
