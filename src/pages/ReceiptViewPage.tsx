
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReceiptData {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  sale_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
    };
  }>;
  customers?: {
    name: string;
  };
}

export const ReceiptViewPage = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReceipt();
  }, [transactionId]);

  const fetchReceipt = async () => {
    if (!transactionId) return;

    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          sale_items (
            quantity,
            unit_price,
            total_price,
            products (
              name
            )
          ),
          customers (
            name
          )
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      setReceipt(data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupata risiti',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!receipt) return;
    
    const receiptContent = generateReceiptText();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    if (!receipt) return '';

    const items = receipt.sale_items.map(item => 
      `${item.products.name} x${item.quantity} = TZS ${item.total_price.toLocaleString()}`
    ).join('\n');

    const subtotal = receipt.sale_items.reduce((sum, item) => sum + item.total_price, 0);
    const vatAmount = subtotal * 0.18;
    
    return `
KIDUKA STORE
Receipt: ${receipt.id.slice(0, 8)}
Date: ${new Date(receipt.created_at).toLocaleDateString('sw-TZ')}
${receipt.customers ? `Customer: ${receipt.customers.name}` : ''}

ITEMS:
${items}

Subtotal: TZS ${subtotal.toLocaleString()}
VAT (18%): TZS ${vatAmount.toLocaleString()}
TOTAL: TZS ${receipt.total_amount.toLocaleString()}

Payment: ${receipt.payment_method.toUpperCase()}

Asante kwa Biashara Yako!
Powered by Kiduka POS
    `.trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Inapakia risiti...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-bold mb-2">Risiti Haijapatikana</h2>
            <p className="text-gray-600 mb-4">Risiti unayotafuta haijapatikana au imeharibika.</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Rudi Nyuma
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-blue-600">KIDUKA STORE</CardTitle>
            <p className="text-sm text-gray-600">Digital Receipt</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center border-b pb-4">
              <p className="text-sm">Receipt: {receipt.id.slice(0, 8)}</p>
              <p className="text-sm">Date: {new Date(receipt.created_at).toLocaleDateString('sw-TZ')}</p>
              {receipt.customers && (
                <p className="text-sm">Customer: {receipt.customers.name}</p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Items:</h4>
              {receipt.sale_items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm mb-1">
                  <span>{item.products.name} x{item.quantity}</span>
                  <span>TZS {item.total_price.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>TZS {(receipt.total_amount / 1.18).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (18%):</span>
                <span>TZS {(receipt.total_amount * 0.18 / 1.18).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>TZS {receipt.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 border-t pt-4">
              <p>Payment: {receipt.payment_method.toUpperCase()}</p>
              <p className="mt-2">Asante kwa Biashara Yako!</p>
              <p className="text-xs">Powered by Kiduka POS</p>
            </div>

            <Button onClick={downloadReceipt} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
