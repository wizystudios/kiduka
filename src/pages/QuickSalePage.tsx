import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { logActivity } from '@/hooks/useActivityLogger';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';

interface Customer { id: string; name: string; }

export const QuickSalePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const { dataOwnerId, ownerBusinessName, loading: dataLoading } = useDataAccess();

  const [formData, setFormData] = useState({
    customer_name: '', customer_id: '', product_name: '', quantity: '',
    unit_price: '', payment_status: 'paid' as 'paid' | 'partial' | 'unpaid',
    amount_paid: '', payment_method: 'cash', notes: ''
  });

  useEffect(() => { if (dataOwnerId) fetchCustomers(); }, [dataOwnerId]);

  const fetchCustomers = async () => {
    if (!dataOwnerId) return;
    const { data } = await supabase.from('customers').select('id, name').eq('owner_id', dataOwnerId).order('name');
    setCustomers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataOwnerId) { toast.error('Hakuna data ya biashara.'); return; }

    try {
      setLoading(true);
      const quantity = parseFloat(formData.quantity);
      const unit_price = parseFloat(formData.unit_price);
      const total_amount = quantity * unit_price;
      const amount_paid = formData.payment_status === 'paid' ? total_amount : parseFloat(formData.amount_paid || '0');
      const balance = total_amount - amount_paid;

      const { error } = await supabase.from('customer_transactions').insert([{
        owner_id: dataOwnerId, customer_id: formData.customer_id || null, customer_name: formData.customer_name,
        transaction_type: 'sale', product_name: formData.product_name, quantity, unit_price, total_amount,
        amount_paid, balance, payment_status: formData.payment_status, payment_method: formData.payment_method,
        notes: formData.notes || null
      }]);
      if (error) throw error;

      if (formData.customer_id && balance > 0) {
        const { data: customer } = await supabase.from('customers').select('outstanding_balance').eq('id', formData.customer_id).single();
        await supabase.from('customers').update({ outstanding_balance: (customer?.outstanding_balance || 0) + balance }).eq('id', formData.customer_id);
      }

      setLastSaleData({
        customer_name: formData.customer_name,
        items: [{ name: formData.product_name, quantity, unit_price, subtotal: total_amount }],
        total_amount, payment_method: formData.payment_method, payment_status: formData.payment_status,
        invoice_number: `INV-${Date.now()}`, date: new Date().toLocaleDateString('sw-TZ')
      });

      logActivity('sale_create', `Mauzo ya TSh ${total_amount.toLocaleString()}`, { amount: total_amount, product: formData.product_name });
      toast.success('Mauzo yamerekodishwa!');
      setShowInvoice(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Imeshindwa kurekodi mauzo');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return parseFloat(formData.quantity || '0') * parseFloat(formData.unit_price || '0');
  };

  if (dataLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {showInvoice && lastSaleData ? (
        <div className="space-y-4">
          <InvoiceGenerator {...lastSaleData} />
          <Button onClick={() => {
            setShowInvoice(false);
            setFormData({ customer_name: '', customer_id: '', product_name: '', quantity: '', unit_price: '', payment_status: 'paid', amount_paid: '', payment_method: 'cash', notes: '' });
          }} className="w-full">
            Mauzo Mengine
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Mauzo ya Haraka</h2>
              <p className="text-xs text-muted-foreground">Rekodi mauzo kwa haraka</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Mteja (Optional)</Label>
              <Select value={formData.customer_id} onValueChange={(value) => {
                const customer = customers.find(c => c.id === value);
                setFormData({ ...formData, customer_id: value, customer_name: customer?.name || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Chagua mteja" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!formData.customer_id && (
              <div>
                <Label className="text-xs">Jina la Mteja</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} placeholder="Walk-in customer" required />
              </div>
            )}

            <div>
              <Label className="text-xs">Bidhaa</Label>
              <Input value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kiasi</Label>
                <Input type="number" step="any" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
              </div>
              <div>
                <Label className="text-xs">Bei (TZS)</Label>
                <Input type="number" step="any" min="0" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} required />
              </div>
            </div>

            <div className="py-3 border-y border-border/50 text-center">
              <p className="text-xs text-muted-foreground">Jumla</p>
              <p className="text-2xl font-bold text-primary">TZS {getTotalAmount().toLocaleString()}</p>
            </div>

            <div>
              <Label className="text-xs">Hali ya Malipo</Label>
              <Select value={formData.payment_status} onValueChange={(v: any) => setFormData({ ...formData, payment_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Amelipa Yote</SelectItem>
                  <SelectItem value="partial">Amelipa Sehemu</SelectItem>
                  <SelectItem value="unpaid">Hajalipa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payment_status === 'partial' && (
              <div>
                <Label className="text-xs">Kiasi Alicholipa (TZS)</Label>
                <Input type="number" step="any" min="0" value={formData.amount_paid} onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })} required />
              </div>
            )}

            <div>
              <Label className="text-xs">Njia ya Malipo</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Taslimu</SelectItem>
                  <SelectItem value="mobile_money">Pesa za Simu</SelectItem>
                  <SelectItem value="bank">Benki</SelectItem>
                  <SelectItem value="credit">Mkopo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Maelezo (Optional)</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Rekodi Mauzo
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};
