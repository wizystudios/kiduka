import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessDocument } from '@/components/BusinessDocument';
import { Download, Loader2, MessageCircle, Printer, Share2 } from 'lucide-react';
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

  const shareWhatsApp = () => {
    const lines = items.map((i) => `• ${i.name} x${i.quantity} = TSh ${i.total.toLocaleString()}`).join('\n');
    const text = `*${businessName}*\nRisiti #${receiptNumber}\n${date}\n\n${lines}\n\n*Jumla: TSh ${total.toLocaleString()}*\nAsante kwa biashara yako · Kiduka`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    onPrint?.();
  };

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Button className="rounded-full" onClick={shareWhatsApp}>
          <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Chapisha
        </Button>
        <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={() => exportDocument('image')}>
          {busy === 'image' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 h-4 w-4" />} Picha
        </Button>
        <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={() => exportDocument('pdf')}>
          {busy === 'pdf' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} PDF
        </Button>
      </div>
    </div>
  );
};