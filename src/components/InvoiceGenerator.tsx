import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoiceProps {
  customer_name: string;
  items: InvoiceItem[];
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  invoice_number?: string;
  date?: string;
}

export const InvoiceGenerator = ({ 
  customer_name, 
  items, 
  total_amount, 
  payment_method = 'cash',
  payment_status = 'paid',
  invoice_number,
  date 
}: InvoiceProps) => {
  const { userProfile } = useAuth();
  const [isPrinting, setIsPrinting] = useState(false);

  const invoiceNum = invoice_number || `INV-${Date.now()}`;
  const invoiceDate = date || format(new Date(), 'dd/MM/yyyy');

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = () => {
    const invoiceContent = document.getElementById('invoice-content');
    if (!invoiceContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNum}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .total { font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Ankara
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div id="invoice-content" className="space-y-4 p-4 border rounded-lg">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">{userProfile?.business_name || 'Kiduka POS'}</h1>
            <p className="text-sm text-muted-foreground">ANKARA YA MAUZO</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Mteja:</p>
              <p>{customer_name}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Namba ya Ankara:</p>
              <p>{invoiceNum}</p>
              <p className="font-semibold mt-2">Tarehe:</p>
              <p>{invoiceDate}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2">Bidhaa</th>
                <th className="text-right py-2">Kiasi</th>
                <th className="text-right py-2">Bei</th>
                <th className="text-right py-2">Jumla</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">TZS {item.unit_price.toLocaleString()}</td>
                  <td className="text-right">TZS {item.subtotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>JUMLA:</span>
              <span>TZS {total_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>Njia ya Malipo:</span>
              <span>
                {payment_method === 'cash' ? 'Taslimu' : 
                 payment_method === 'mobile_money' ? 'Pesa za Simu' : 'Benki'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Hali ya Malipo:</span>
              <span>
                {payment_status === 'paid' ? 'Amelipa' : 
                 payment_status === 'partial' ? 'Nusu' : 'Hajalipa'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>Asante kwa biashara yako!</p>
            <p className="mt-2">Imetengenezwa na Kiduka POS</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Chapisha
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Pakua
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};