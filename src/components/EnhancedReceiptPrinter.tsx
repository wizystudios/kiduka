import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import { KidukaLogo } from '@/components/KidukaLogo';

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
  vatNumber,
  onPrint 
}: EnhancedReceiptPrinterProps) => {
  const generateReceiptHTML = () => {
    const date = new Date().toLocaleString('en-TZ', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const getPaymentMethodDisplay = () => {
      switch (paymentData.method) {
        case 'cash':
          return 'CASH PAYMENT';
        case 'mobile': {
          const providerNames: Record<string, string> = {
            'mpesa': 'M-Pesa',
            'airtel': 'Airtel Money',
            'halopesa': 'Halo Pesa',
            'tigopesa': 'Mixx by Yas (Tigo Pesa)'
          };
          return `${providerNames[paymentData.provider || '']} - ${paymentData.phoneNumber}`;
        }
        case 'bank': {
          const bankNames: Record<string, string> = {
            'nmb': 'NMB Bank',
            'crdb': 'CRDB Bank'
          };
          return `${bankNames[paymentData.provider || '']} - ****${paymentData.accountNumber?.slice(-4)}`;
        }
        default:
          return 'UNKNOWN PAYMENT';
      }
    };
    
    return `
      <div style="font-family: 'Courier New', monospace; width: 350px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0284c7;">
        <!-- Kiduka Watermark Background -->
        <div style="position: relative; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.05; font-size: 48px; font-weight: bold; color: #0284c7; z-index: 0;">
            KIDUKA
          </div>
          
          <!-- Header with Logo -->
          <div style="text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: white; font-weight: bold; font-size: 16px;">K</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">KIDUKA</h1>
            </div>
            <h2 style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #1f2937;">${businessName}</h2>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Smart Business Solution</p>
            ${vatNumber ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #6b7280;">VAT No: ${vatNumber}</p>` : ''}
          </div>
          
          <!-- Transaction Details -->
          <div style="margin-bottom: 15px; position: relative; z-index: 1;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 12px; color: #374151;">Receipt No:</span>
              <span style="font-size: 12px; font-weight: bold; color: #1f2937;">${transactionId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 12px; color: #374151;">Date & Time:</span>
              <span style="font-size: 12px; color: #1f2937;">${date}</span>
            </div>
            ${customerName ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 12px; color: #374151;">Customer:</span>
              <span style="font-size: 12px; color: #1f2937;">${customerName}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; color: #374151;">Payment:</span>
              <span style="font-size: 12px; color: #1f2937;">${getPaymentMethodDisplay()}</span>
            </div>
          </div>
          
          <!-- Items -->
          <div style="border-bottom: 2px dashed #9ca3af; padding-bottom: 10px; margin-bottom: 10px; position: relative; z-index: 1;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 11px;">ITEM</span>
              <span style="font-size: 11px;">QTY</span>
              <span style="font-size: 11px;">PRICE</span>
              <span style="font-size: 11px;">TOTAL</span>
            </div>
            ${items.map(item => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">
                <span style="flex: 1; color: #374151;">${item.name}</span>
                <span style="width: 40px; text-align: center; color: #374151;">${item.quantity}</span>
                <span style="width: 60px; text-align: right; color: #374151;">TZS ${item.price.toLocaleString()}</span>
                <span style="width: 70px; text-align: right; font-weight: bold; color: #1f2937;">TZS ${item.total.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          
          <!-- Totals -->
          <div style="position: relative; z-index: 1;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 13px; color: #374151;">Subtotal:</span>
              <span style="font-size: 13px; color: #1f2937;">TZS ${subtotal.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #374151;">VAT (18%):</span>
              <span style="font-size: 13px; color: #1f2937;">TZS ${vatAmount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #0284c7;">
              <span style="color: #1f2937;">TOTAL:</span>
              <span style="color: #0284c7;">TZS ${total.toLocaleString()}</span>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #9ca3af; position: relative; z-index: 1;">
            <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: bold;">Asante kwa Biashara Yako!</p>
            <p style="margin: 5px 0; font-size: 10px; color: #6b7280;">Thank you for your business!</p>
            <p style="margin: 5px 0 0 0; font-size: 9px; color: #9ca3af;">Powered by Kiduka POS System</p>
            <p style="margin: 2px 0 0 0; font-size: 8px; color: #9ca3af;">www.kiduka.co.tz</p>
          </div>
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
        <head>
          <title>Receipt - ${transactionId}</title>
          <meta charset="UTF-8">
        </head>
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
