import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBag, Plus, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
// PageHeader removed for cleaner UI
import { InvoiceGenerator } from '@/components/InvoiceGenerator';

interface Customer {
  id: string;
  name: string;
}

export const QuickSalePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_id: '',
    product_name: '',
    quantity: '',
    unit_price: '',
    payment_status: 'paid' as 'paid' | 'partial' | 'unpaid',
    amount_paid: '',
    payment_method: 'cash',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [user?.id]);

  const fetchCustomers = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const quantity = parseFloat(formData.quantity);
      const unit_price = parseFloat(formData.unit_price);
      const total_amount = quantity * unit_price;
      const amount_paid = formData.payment_status === 'paid' 
        ? total_amount 
        : parseFloat(formData.amount_paid || '0');
      const balance = total_amount - amount_paid;

      const transactionData = {
        owner_id: user.id,
        customer_id: formData.customer_id || null,
        customer_name: formData.customer_name,
        transaction_type: 'sale',
        product_name: formData.product_name,
        quantity,
        unit_price,
        total_amount,
        amount_paid,
        balance,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('customer_transactions')
        .insert([transactionData]);

      if (error) throw error;

      // Update customer balance if customer selected
      if (formData.customer_id && balance > 0) {
        const { data: customer } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .eq('id', formData.customer_id)
          .single();

        const newBalance = (customer?.outstanding_balance || 0) + balance;
        await supabase
          .from('customers')
          .update({ outstanding_balance: newBalance })
          .eq('id', formData.customer_id);
      }

      // Prepare invoice data
      setLastSaleData({
        customer_name: formData.customer_name,
        items: [{
          name: formData.product_name,
          quantity,
          unit_price,
          subtotal: total_amount
        }],
        total_amount,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        invoice_number: `INV-${Date.now()}`,
        date: new Date().toLocaleDateString('sw-TZ')
      });

      toast.success('Mauzo yamerekodishwa!');
      setShowInvoice(true);
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Imeshindwa kurekodi mauzo');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    const qty = parseFloat(formData.quantity || '0');
    const price = parseFloat(formData.unit_price || '0');
    return qty * price;
  };

  return (
    <div className="page-container">

      {showInvoice && lastSaleData ? (
        <div className="space-y-4">
          <InvoiceGenerator {...lastSaleData} />
          <Button 
            onClick={() => {
              setShowInvoice(false);
              setFormData({
                customer_name: '',
                customer_id: '',
                product_name: '',
                quantity: '',
                unit_price: '',
                payment_status: 'paid',
                amount_paid: '',
                payment_method: 'cash',
                notes: ''
              });
            }}
            className="w-full"
          >
            Mauzo Mengine
          </Button>
        </div>
      ) : (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Mauzo ya Haraka</CardTitle>
              <p className="text-sm text-muted-foreground">Rekodi mauzo kwa haraka</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customer">Mteja (Optional)</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => {
                  const customer = customers.find(c => c.id === value);
                  setFormData({
                    ...formData,
                    customer_id: value,
                    customer_name: customer?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chagua mteja" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formData.customer_id && (
              <div>
                <Label htmlFor="customer_name">Jina la Mteja</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Walk-in customer"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="product_name">Bidhaa</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Kiasi</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Bei (TZS)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Jumla:</span>
                <span className="text-2xl font-bold text-primary">
                  TZS {getTotalAmount().toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="payment_status">Hali ya Malipo</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value: 'paid' | 'partial' | 'unpaid') => 
                  setFormData({ ...formData, payment_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Amelipa Yote</SelectItem>
                  <SelectItem value="partial">Amelipa Sehemu</SelectItem>
                  <SelectItem value="unpaid">Hajalipa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payment_status === 'partial' && (
              <div>
                <Label htmlFor="amount_paid">Kiasi Alicholipa (TZS)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="payment_method">Njia ya Malipo</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Taslimu</SelectItem>
                  <SelectItem value="mobile_money">Pesa za Simu</SelectItem>
                  <SelectItem value="bank">Benki</SelectItem>
                  <SelectItem value="credit">Mkopo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Maelezo (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Rekodi Mauzo
            </Button>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
};
