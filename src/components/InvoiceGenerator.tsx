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
      <BusinessDocument
        ref={invoiceRef}
        kind="invoice"
        businessName={businessName}
        documentNumber={invoiceNum}
        documentDate={invoiceDate}
        customerName={customer_name}
        customerPhone={customer_phone}
        paymentMethod={payment_method}
        paymentStatus={payment_status}
        items={items}
        subtotal={total_amount}
        total={total_amount}
        notes={notes}
      />

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
