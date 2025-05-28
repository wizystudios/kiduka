
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptPrinterProps {
  items: ReceiptItem[];
  total: number;
  transactionId: string;
  onPrint?: () => void;
}

export const ReceiptPrinter = ({ items, total, transactionId, onPrint }: ReceiptPrinterProps) => {
  const generateReceiptHTML = () => {
    const date = new Date().toLocaleString();
    
    return `
      <div style="font-family: monospace; width: 300px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">KIDUKA</h2>
          <p style="margin: 5px 0; font-size: 14px;">Smart Business Solution</p>
          <p style="margin: 0; font-size: 12px;">Transaction: ${transactionId}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-size: 12px;">Date: ${date}</p>
        </div>
        
        <div style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 12px;">${item.quantity}x ${item.name}</span>
              <span style="font-size: 12px;">$${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align: right; font-weight: bold; font-size: 16px; margin-top: 10px;">
          <p style="margin: 0;">TOTAL: $${total.toFixed(2)}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #000;">
          <p style="margin: 0; font-size: 10px;">Thank you for your business!</p>
          <p style="margin: 5px 0 0 0; font-size: 10px;">Powered by Kiduka POS</p>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${transactionId}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 0.5in; }
              }
            </style>
          </head>
          <body>
            ${generateReceiptHTML()}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    onPrint?.();
  };

  const handleDownloadPDF = () => {
    const receiptContent = generateReceiptHTML();
    const blob = new Blob([`
      <html>
        <head><title>Receipt</title></head>
        <body>${receiptContent}</body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transactionId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Printer className="h-4 w-4 mr-2" />
          Receipt Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={handlePrint}
          className="w-full bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button 
          onClick={handleDownloadPDF}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
};
