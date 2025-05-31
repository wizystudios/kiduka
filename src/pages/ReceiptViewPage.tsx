
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Receipt, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReceiptData {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  business_name?: string;
}

export const ReceiptViewPage = () => {
  const { transactionId } = useParams();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReceipt();
  }, [transactionId]);

  const fetchReceipt = async () => {
    if (!transactionId) {
      setError('ID ya muamala haipo');
      setLoading(false);
      return;
    }

    try {
      // Fetch sale data
      const { data: sale, error: saleError } = await supabase
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
          )
        `)
        .eq('id', transactionId)
        .single();

      if (saleError) {
        console.error('Sale fetch error:', saleError);
        setError('Risiti haijapatikana');
        setLoading(false);
        return;
      }

      // Transform the data
      const receiptData: ReceiptData = {
        id: sale.id,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        business_name: 'Kiduka Store',
        items: sale.sale_items.map((item: any) => ({
          name: item.products?.name || 'Bidhaa Isiyojulikana',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      setReceipt(receiptData);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setError('Hitilafu katika kupakia risiti');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!receipt) return;

    const receiptText = `
${receipt.business_name || 'KIDUKA STORE'}
================================
Risiti: ${receipt.id.slice(0, 8)}
Tarehe: ${new Date(receipt.created_at).toLocaleDateString('sw-TZ')}

BIDHAA:
${receipt.items.map(item => 
  `${item.name} x${item.quantity} = TZS ${item.total_price.toLocaleString()}`
).join('\n')}

================================
JUMLA: TZS ${receipt.total_amount.toLocaleString()}
Malipo: ${receipt.payment_method.toUpperCase()}

Asante kwa Biashara Yako!
Powered by Kiduka POS
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risiti-${receipt.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inapakia risiti...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Receipt className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Risiti Haijapatikana</h2>
            <p className="text-gray-600 mb-4">{error || 'Risiti ambayo unaitafuta haijapatikana'}</p>
            <Button onClick={() => window.location.href = '/'}>
              Rudi Nyumbani
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = receipt.items.reduce((sum, item) => sum + item.total_price, 0);
  const vatAmount = subtotal * 0.18;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">{receipt.business_name || 'KIDUKA STORE'}</CardTitle>
            <p className="text-emerald-100">Risiti ya Muamala</p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-4">
            {/* Transaction Info */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Namba ya Muamala:</span>
              <span className="font-mono">{receipt.id.slice(0, 8)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tarehe:</span>
              <span>{new Date(receipt.created_at).toLocaleDateString('sw-TZ')}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Muda:</span>
              <span>{new Date(receipt.created_at).toLocaleTimeString('sw-TZ')}</span>
            </div>

            <hr className="my-4" />

            {/* Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Bidhaa Zilizouzwa:</h3>
              {receipt.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-600 text-xs">
                      {item.quantity} x TZS {item.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <span className="font-medium">TZS {item.total_price.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <hr className="my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jumla Kuu:</span>
                <span>TZS {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Kodi (18%):</span>
                <span>TZS {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-bold text-lg">JUMLA:</span>
                <span className="font-bold text-lg text-emerald-600">
                  TZS {receipt.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            <hr className="my-4" />

            {/* Payment Method */}
            <div className="text-center">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Malipo: {receipt.payment_method.toUpperCase()}
              </Badge>
            </div>

            {/* Download Button */}
            <Button 
              onClick={downloadReceipt}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Pakua Risiti
            </Button>

            <div className="text-center text-xs text-gray-500 mt-4">
              <p>Asante kwa Biashara Yako!</p>
              <p className="mt-1">Powered by Kiduka POS</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
