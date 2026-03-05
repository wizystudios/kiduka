import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Percent, Plus, Trash2, Edit2, Loader2, Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Discount {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  applicable_products: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    start_date: '',
    end_date: '',
    active: true,
    applicable_products: [] as string[]
  });

  useEffect(() => {
    if (user?.id) {
      fetchDiscounts();
      fetchProducts();
    }
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, price, image_url')
      .eq('owner_id', user.id)
      .order('name');
    if (data) setProducts(data);
  };

  const fetchDiscounts = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDiscounts((data || []).map(d => ({
        ...d,
        discount_type: d.discount_type as 'percentage' | 'fixed',
        applicable_products: Array.isArray(d.applicable_products) ? d.applicable_products as string[] : []
      })));
    } catch {
      toast.error('Imeshindwa kupakia punguzo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const discountData = {
        owner_id: user.id,
        name: formData.name,
        discount_type: formData.discount_type,
        value: parseFloat(formData.value),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        active: formData.active,
        applicable_products: formData.applicable_products
      };

      if (editingDiscount) {
        const { error } = await supabase.from('discounts').update(discountData).eq('id', editingDiscount.id).eq('owner_id', user.id);
        if (error) throw error;
        toast.success('Punguzo limesasishwa!');
      } else {
        const { error } = await supabase.from('discounts').insert([discountData]);
        if (error) throw error;
        toast.success('Punguzo limeongezwa!');
      }

      setDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch {
      toast.error('Imeshindwa kuhifadhi punguzo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta punguzo hili?')) return;
    try {
      const { error } = await supabase.from('discounts').delete().eq('id', id).eq('owner_id', user!.id);
      if (error) throw error;
      toast.success('Punguzo limefutwa!');
      fetchDiscounts();
    } catch {
      toast.error('Imeshindwa kufuta punguzo');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', discount_type: 'percentage', value: '', start_date: '', end_date: '', active: true, applicable_products: [] });
    setEditingDiscount(null);
    setProductSearch('');
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      start_date: discount.start_date || '',
      end_date: discount.end_date || '',
      active: discount.active,
      applicable_products: discount.applicable_products || []
    });
    setDialogOpen(true);
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_products: prev.applicable_products.includes(productId)
        ? prev.applicable_products.filter(id => id !== productId)
        : [...prev.applicable_products, productId]
    }));
  };

  const isDiscountActive = (d: Discount) => {
    if (!d.active) return false;
    const now = new Date();
    if (d.start_date && new Date(d.start_date) > now) return false;
    if (d.end_date && new Date(d.end_date) < now) return false;
    return true;
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Punguzo za Bei</h1>
          <p className="text-sm text-muted-foreground">Weka punguzo kwa bidhaa zako - zitaonyeshwa Sokoni na Dukani</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl"><Plus className="h-4 w-4 mr-2" />Ongeza Punguzo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 text-center border-b border-border">
              <Percent className="h-8 w-8 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-bold">{editingDiscount ? 'Hariri Punguzo' : 'Ongeza Punguzo Jipya'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <Label className="text-xs">Jina la Punguzo</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-2xl" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Aina</Label>
                  <Select value={formData.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Asilimia (%)</SelectItem>
                      <SelectItem value="fixed">Kiasi (TZS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Thamani {formData.discount_type === 'percentage' ? '(%)' : '(TZS)'}</Label>
                  <Input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="rounded-2xl" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Kuanza</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="rounded-2xl" />
                </div>
                <div>
                  <Label className="text-xs">Kuisha</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="rounded-2xl" />
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <Label className="text-xs mb-2 block">Bidhaa zenye Punguzo ({formData.applicable_products.length} zimechaguliwa)</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tafuta bidhaa..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 rounded-2xl" />
                </div>
                <ScrollArea className="h-40 border border-border rounded-2xl p-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Hakuna bidhaa</p>
                  ) : (
                    filteredProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-xl cursor-pointer" onClick={() => toggleProduct(p.id)}>
                        <Checkbox checked={formData.applicable_products.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">TSh {p.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
                {formData.applicable_products.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Kama huchagui bidhaa, punguzo litatumika kwa bidhaa zote</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl">Ghairi</Button>
                <Button type="submit" className="flex-1 rounded-2xl">{editingDiscount ? 'Sasisha' : 'Ongeza'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {discounts.length === 0 ? (
          <Card className="rounded-3xl">
            <CardContent className="py-12 text-center">
              <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Bado hujaweka punguzo lolote</p>
              <p className="text-xs text-muted-foreground mt-1">Weka punguzo na bidhaa zitaonyesha bei mpya Sokoni na Dukani</p>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => {
            const active = isDiscountActive(discount);
            const productNames = discount.applicable_products.length > 0
              ? products.filter(p => discount.applicable_products.includes(p.id)).map(p => p.name)
              : [];

            return (
              <Card key={discount.id} className="rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${active ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'}`}>
                      <Percent className={`h-5 w-5 ${active ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{discount.name}</CardTitle>
                      <p className="text-sm text-primary font-semibold">
                        {discount.discount_type === 'percentage'
                          ? `${discount.value}% punguzo`
                          : `TSh ${discount.value.toLocaleString()} punguzo`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(discount)} className="rounded-2xl">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(discount.id)} className="rounded-2xl">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={active ? "default" : "secondary"} className="rounded-full">
                      {active ? '🟢 Inatumika' : '⚪ Haitumiki'}
                    </Badge>
                    {discount.start_date && (
                      <span className="text-xs text-muted-foreground">
                        Kuanzia: {format(new Date(discount.start_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                    {discount.end_date && (
                      <span className="text-xs text-muted-foreground">
                        Hadi: {format(new Date(discount.end_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                  {productNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {productNames.slice(0, 5).map((name, i) => (
                        <Badge key={i} variant="outline" className="text-xs rounded-full">{name}</Badge>
                      ))}
                      {productNames.length > 5 && (
                        <Badge variant="outline" className="text-xs rounded-full">+{productNames.length - 5} zaidi</Badge>
                      )}
                    </div>
                  )}
                  {discount.applicable_products.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">Inatumika kwa bidhaa zote</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
