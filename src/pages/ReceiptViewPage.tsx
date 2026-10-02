import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessDocument, BusinessDocumentItem } from '@/components/BusinessDocument';

interface ReceiptData {
  id: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  businessName: string;
  items: BusinessDocumentItem[];
}

export const ReceiptViewPage = () => {
  const { transactionId } = useParams();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!transactionId) { setError('Namba ya risiti haipo'); setLoading(false); return; }
      const { data: sale, error: saleError } = await supabase.from('sales').select('id,owner_id,total_amount,payment_method,payment_status,created_at,sales_items(quantity,unit_price,subtotal,products(name))').eq('id', transactionId).single();
      if (saleError || !sale) { setError('Risiti haijapatikana'); setLoading(false); return; }
      const { data: owner } = await supabase.from('profiles').select('business_name').eq('id', sale.owner_id).single();
      if (!owner?.business_name?.trim()) { setError('Jina la biashara halijawekwa'); setLoading(false); return; }
      setReceipt({
        id: sale.id, total: Number(sale.total_amount), paymentMethod: sale.payment_method || 'cash', paymentStatus: sale.payment_status || 'paid', createdAt: sale.created_at,
        businessName: owner.business_name,
        items: (sale.sales_items || []).map((item: any) => ({ name: item.products?.name || 'Bidhaa', quantity: Number(item.quantity), unit_price: Number(item.unit_price), subtotal: Number(item.subtotal) }))
      });
      setLoading(false);
    };
    load();
  }, [transactionId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Inapakia risiti...</div>;
  if (error || !receipt) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-4 text-center"><Receipt className="h-10 w-10 text-destructive" /><h1 className="font-bold">Risiti haijapatikana</h1><p className="text-sm text-muted-foreground">{error}</p></div>;

  return (
    <main className="min-h-screen bg-muted/30 px-3 py-6 md:py-10">
      <BusinessDocument kind="receipt" businessName={receipt.businessName} documentNumber={receipt.id.slice(0, 8).toUpperCase()} documentDate={new Date(receipt.createdAt).toLocaleString('sw-TZ')} paymentMethod={receipt.paymentMethod} paymentStatus={receipt.paymentStatus} items={receipt.items} subtotal={receipt.total} total={receipt.total} />
    </main>
  );
};