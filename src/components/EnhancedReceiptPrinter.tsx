import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusinessDocument } from '@/components/BusinessDocument';
import { KidukaSuccessAnimation } from '@/components/KidukaSuccessAnimation';
import { Download, Loader2, Printer, Share2 } from 'lucide-react';
import { captureElementAsImage, createPdfFromImage, shareOrDownloadFile } from '@/utils/shareExport';
import { toast } from 'sonner';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface PaymentData {
  method: 'cash' | 'mobile' | 'bank';
  provider?: string;
  phoneNumber?: string;
  accountNumber?: string;
  transactionId?: string;
}

interface EnhancedReceiptPrinterProps {
  items: ReceiptItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  transactionId: string;
  paymentData: PaymentData;
  customerName?: string;
  businessName: string;
  vatNumber?: string;
  onPrint?: () => void;
}

export const EnhancedReceiptPrinter = ({
  items,
  subtotal,
  vatAmount,
  total,
  transactionId,
  paymentData,
  customerName,
  businessName,
  onPrint,
}: EnhancedReceiptPrinterProps) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'image' | 'pdf' | null>(null);
  const receiptNumber = transactionId.slice(0, 8).toUpperCase();
  const date = new Date().toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' });

  const exportDocument = async (type: 'image' | 'pdf') => {
    if (!documentRef.current) return;
    setBusy(type);
    try {
      const capture = await captureElementAsImage(documentRef.current);
      const file = type === 'pdf'
        ? createPdfFromImage(capture, `kiduka-risiti-${receiptNumber}.pdf`)
        : new File([capture.blob], `kiduka-risiti-${receiptNumber}.png`, { type: 'image/png' });
      const result = await shareOrDownloadFile(file, `Risiti ${receiptNumber} - ${businessName}`);
      toast.success(result === 'shared' ? 'Risiti imeshirikishwa' : 'Risiti imepakuliwa');
    } catch (error: any) {
      toast.error(error?.message || 'Imeshindikana kuandaa risiti');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card px-4 py-1 shadow-sm">
        <KidukaSuccessAnimation amount={total} label={paymentData.method === 'cash' ? 'Taslimu' : paymentData.method === 'mobile' ? 'Pesa za Simu' : 'Benki'} title="Mauzo Yamekamilika!" />
        <div className="mb-4 flex items-center justify-center gap-2">
          <Badge className="rounded-full bg-success text-success-foreground">Amelipa</Badge>
          <span className="text-xs text-muted-foreground">Muamala #{receiptNumber}</span>
        </div>
      </div>

      <BusinessDocument
        ref={documentRef}
        kind="receipt"
        businessName={businessName}
        documentNumber={receiptNumber}
        documentDate={date}
        customerName={customerName}
        customerPhone={paymentData.phoneNumber}
        paymentMethod={paymentData.method}
        paymentStatus="paid"
        items={items.map((item) => ({ name: item.name, quantity: item.quantity, unit_price: item.price, subtotal: item.total }))}
        subtotal={subtotal}
        taxAmount={vatAmount}
        total={total}
        notes={paymentData.transactionId ? `Rejea: ${paymentData.transactionId}` : undefined}
      />

      <div className="grid grid-cols-3 gap-2 print:hidden">
        <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Chapisha
        </Button>
        <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={() => exportDocument('image')}>
          {busy === 'image' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 h-4 w-4" />} Picha
        </Button>
        <Button className="rounded-full" disabled={busy !== null} onClick={() => exportDocument('pdf')}>
          {busy === 'pdf' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} PDF
        </Button>
      </div>
      <Button variant="outline" className="w-full rounded-full print:hidden" onClick={onPrint}>Tuma risiti kwa mteja</Button>
    </div>
  );
};