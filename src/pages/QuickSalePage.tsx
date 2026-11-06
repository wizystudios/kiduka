import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { saleSuccessToast } from '@/lib/saleToast';
import { logActivity } from '@/hooks/useActivityLogger';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';

interface Customer { id: string; name: string; }
interface ProductOption { id: string; name: string; price: number; stock_quantity: number | null; }

export const QuickSalePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [saveProduct, setSaveProduct] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const { dataOwnerId, branchId, ownerBusinessName, loading: dataLoading } = useDataAccess();
  const { can, loading: permLoading } = usePermissions();

  const [formData, setFormData] = useState({
    customer_name: '', customer_id: '', product_name: '', quantity: '',
    unit_price: '', payment_status: 'paid' as 'paid' | 'partial' | 'unpaid',
    amount_paid: '', payment_method: 'cash', payment_reference: '', notes: ''
  });

  useEffect(() => { if (dataOwnerId) { fetchCustomers(); fetchProducts(); } }, [dataOwnerId, branchId]);

  const fetchProducts = async () => {
    if (!dataOwnerId) return;
    let query = supabase.from('products').select('id, name, price, stock_quantity')
      .eq('owner_id', dataOwnerId).or('is_archived.is.null,is_archived.eq.false');
    if (branchId) query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    const { data } = await query.order('name').limit(1000);
    setProducts((data as ProductOption[]) || []);
  };

  const term = formData.product_name.trim().toLowerCase();
  const suggestions = term ? products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 8) : products.slice(0, 8);
  const exactProduct = products.find(p => p.name.trim().toLowerCase() === term);
  const pickProduct = (p: ProductOption) => {
    setProductId(p.id);
    setFormData(f => ({ ...f, product_name: p.name, unit_price: String(p.price ?? '') }));
    setShowSuggestions(false);
  };
  const isDebt = formData.payment_status !== 'paid' || formData.payment_method === 'credit';

  const fetchCustomers = async () => {
    if (!dataOwnerId) return;
    let query = supabase.from('customers').select('id, name').eq('owner_id', dataOwnerId);
    if (branchId) query = query.eq('branch_id', branchId);
    const { data } = await query.order('name');
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
      if (isDebt && !formData.customer_id && !formData.customer_name.trim()) {
        toast.error('Weka jina la mteja anayedaiwa'); setLoading(false); return;
      }
      const amount_paid = !isDebt ? total_amount : formData.payment_status === 'partial' ? Math.min(total_amount, parseFloat(formData.amount_paid || '0')) : formData.payment_status === 'paid' && formData.payment_method === 'credit' ? 0 : formData.payment_status === 'paid' ? total_amount : parseFloat(formData.amount_paid || '0');
      const balance = total_amount - amount_paid;

      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        owner_id: dataOwnerId,
        branch_id: branchId || undefined,
        customer_id: formData.customer_id || null,
        total_amount,
        payment_method: formData.payment_method,
        payment_status: balance > 0 ? (amount_paid > 0 ? 'partial' : 'unpaid') : 'paid',
        payment_details: { amount_paid, balance, notes: formData.notes || '', payment_reference: formData.payment_reference || '' },
      }).select('id,created_at').single();
      if (saleError) throw saleError;

      // Use the picked product, or an exact-name match, or save a new product
      let resolvedProductId: string | null = productId || exactProduct?.id || null;
      if (!resolvedProductId && saveProduct && formData.product_name.trim()) {
        const { data: created, error: prodErr } = await supabase.from('products').insert({
          owner_id: dataOwnerId, branch_id: branchId || null,
          name: formData.product_name.trim(), price: unit_price, stock_quantity: 0,
        } as any).select('id').single();
        if (prodErr) toast.error('Bidhaa haikuhifadhiwa kwenye orodha');
        else resolvedProductId = created.id;
      }
      const matchedProduct = resolvedProductId ? { id: resolvedProductId } : null;

      const { error: itemError } = await supabase.from('sales_items').insert({
        sale_id: sale.id,
        product_id: matchedProduct?.id || null,
        quantity: Math.max(1, Math.round(quantity)),
        unit_price,
        subtotal: total_amount,
      });
      if (itemError) throw itemError;

      const { error: effectsError } = await supabase.rpc('apply_staff_sale_effects', {
        p_sale_id: sale.id,
        p_customer_id: formData.customer_id || null,
        p_debt: 0,
      } as any);
      if (effectsError) {
        console.error('Stock/debt update failed:', effectsError);
        toast.error('Mauzo yamehifadhiwa, lakini stoo haijasasishwa');
      }

      if (balance > 0) {
        const { error: debtError } = await supabase.rpc('record_sale_debt', {
          p_sale_id: sale.id,
          p_customer_id: formData.customer_id || null,
          p_customer_name: formData.customer_name,
          p_customer_phone: customerPhone,
          p_amount_paid: amount_paid,
        } as any);
        if (debtError) { console.error('Debt record failed:', debtError); toast.error('Mauzo yamehifadhiwa, lakini deni halijaandikwa'); }
      }

      const invoiceNumber = `INV-${sale.id.slice(0, 8).toUpperCase()}`;
      const { error: invoiceError } = await supabase.from('invoices').upsert({
        owner_id: dataOwnerId,
        branch_id: branchId || undefined,
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name || 'Mteja wa Kawaida',
        items: [{ name: formData.product_name, quantity, unit_price, subtotal: total_amount }],
        total_amount,
        payment_method: formData.payment_method,
        status: balance > 0 ? (amount_paid > 0 ? 'partial' : 'unpaid') : 'paid',
        notes: formData.notes || null,
        sale_id: sale.id,
      }, { onConflict: 'sale_id' });
      if (invoiceError) console.error('Invoice save failed (sale kept):', invoiceError);

      const { error } = balance > 0 ? { error: null } : await supabase.from('customer_transactions').insert([{
        owner_id: dataOwnerId, branch_id: branchId || null, customer_id: formData.customer_id || null, customer_name: formData.customer_name,
        transaction_type: 'sale', product_name: formData.product_name, quantity, unit_price, total_amount,
        amount_paid, balance, payment_status: 'paid', payment_method: formData.payment_method,
        notes: formData.notes || null
      }]);
      if (error) throw error;


      setLastSaleData({
        customer_name: formData.customer_name,
        items: [{ name: formData.product_name, quantity, unit_price, subtotal: total_amount }],
        total_amount, payment_method: formData.payment_method, payment_status: formData.payment_status, payment_reference: formData.payment_reference || undefined,
         invoice_number: invoiceNumber, date: new Date(sale.created_at).toLocaleDateString('sw-TZ')
      });

      logActivity('sale_create', `Mauzo ya TSh ${total_amount.toLocaleString()}`, { amount: total_amount, product: formData.product_name });
      fetchProducts(); fetchCustomers();
      saleSuccessToast(sale?.id, total_amount, 'Mauzo yamerekodishwa!');
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

  if (!permLoading && !can('can_create_sales')) {
    return (
      <div className="p-8 text-center space-y-2">
        <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Huna ruhusa ya kurekodi mauzo</p>
        <p className="text-xs text-muted-foreground">Mmiliki wa biashara ndiye anaweza kukupa ruhusa hii kwenye ukurasa wa Ruhusa.</p>
      </div>
    );
  }

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
            setProductId(''); setCustomerPhone('');
            setFormData({ customer_name: '', customer_id: '', product_name: '', quantity: '', unit_price: '', payment_status: 'paid', amount_paid: '', payment_method: 'cash', payment_reference: '', notes: '' });
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
                {isDebt && (
                  <Input className="mt-2" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Namba ya simu ya mteja (si lazima)" />
                )}
              </div>
            )}

            <div>
              <Label className="text-xs">Bidhaa</Label>
              <div className="relative">
                <Input
                  value={formData.product_name}
                  placeholder="Tafuta au andika jina la bidhaa"
                  autoComplete="off"
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onChange={(e) => { setProductId(''); setShowSuggestions(true); setFormData({ ...formData, product_name: e.target.value }); }}
                  required
                />
                {showSuggestions && suggestions.length > 0 && !productId && (
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-2xl border border-border bg-popover shadow-lg">
                    {suggestions.map(p => (
                      <button type="button" key={p.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pickProduct(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                        <span className="truncate">{p.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">TZS {Number(p.price || 0).toLocaleString()} · Stoo {p.stock_quantity ?? 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.product_name.trim() && !productId && !exactProduct && (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={saveProduct} onChange={(e) => setSaveProduct(e.target.checked)} />
                  Hifadhi bidhaa hii mpya ili uichague wakati ujao
                </label>
              )}
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

            {formData.payment_method !== 'cash' && (
              <div>
                <Label className="text-xs">Namba ya Malipo / Muamala</Label>
                <Input value={formData.payment_reference} onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })} placeholder="Mf. namba ya muamala wa simu" />
              </div>
            )}

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
