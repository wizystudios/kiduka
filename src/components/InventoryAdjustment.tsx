import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Package, ClipboardCheck } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
}

export const InventoryAdjustment = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    product_id: '',
    actual_count: '',
    adjustment_type: 'count' as 'count' | 'damage' | 'shrinkage' | 'return',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('owner_id', user.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === formData.product_id);
  };

  const calculateDifference = () => {
    const product = getSelectedProduct();
    if (!product || !formData.actual_count) return 0;
    return parseFloat(formData.actual_count) - product.stock_quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const product = getSelectedProduct();
    if (!product) {
      toast.error('Chagua bidhaa');
      return;
    }

    try {
      setLoading(true);
      const actualCount = parseFloat(formData.actual_count);
      const difference = calculateDifference();

      if (difference === 0) {
        toast.info('Hakuna mabadiliko ya stock');
        return;
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: actualCount })
        .eq('id', formData.product_id);

      if (updateError) throw updateError;

      // Log inventory movement
      const movementType = difference > 0 ? 'increase' : 'decrease';
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          owner_id: user.id,
          product_id: formData.product_id,
          movement_type: movementType,
          quantity_change: Math.abs(difference),
          quantity_before: product.stock_quantity,
          quantity_after: actualCount,
          reason: `${formData.adjustment_type}: ${formData.reason}`,
          notes: formData.notes || null
        }]);

      if (movementError) throw movementError;

      toast.success('Marekebisho ya stock yamefanywa!');
      setFormData({
        product_id: '',
        actual_count: '',
        adjustment_type: 'count',
        reason: '',
        notes: ''
      });
      fetchProducts();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Imeshindwa kufanya marekebisho');
    } finally {
      setLoading(false);
    }
  };

  const adjustmentTypes = [
    { value: 'count', label: 'Hesabu ya Stock' },
    { value: 'damage', label: 'Uharibifu' },
    { value: 'shrinkage', label: 'Upotevu' },
    { value: 'return', label: 'Bidhaa Zilizorejesha' }
  ];

  const selectedProduct = getSelectedProduct();
  const difference = calculateDifference();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Marekebisho ya Stock</CardTitle>
            <p className="text-sm text-muted-foreground">Rekodi mabadiliko ya stock</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Bidhaa</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value, actual_count: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chagua bidhaa" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stock: {product.stock_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Stock ya Sasa:</span>
                <span className="text-lg font-bold">{selectedProduct.stock_quantity}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="adjustment_type">Aina ya Marekebisho</Label>
            <Select
              value={formData.adjustment_type}
              onValueChange={(value: any) => setFormData({ ...formData, adjustment_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adjustmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="actual_count">Hesabu Halisi</Label>
            <Input
              id="actual_count"
              type="number"
              step="any"
              min="0"
              value={formData.actual_count}
              onChange={(e) => setFormData({ ...formData, actual_count: e.target.value })}
              placeholder="Weka idadi halisi"
              required
            />
          </div>

          {formData.actual_count && selectedProduct && (
            <div className={`p-4 rounded-lg ${difference > 0 ? 'bg-green-50' : difference < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tofauti:</span>
                <span className={`text-lg font-bold ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {difference > 0 ? '+' : ''}{difference}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Sababu</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Eleza sababu ya marekebisho"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Maelezo Zaidi (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Maelezo ya ziada..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.product_id}>
            <Package className="h-4 w-4 mr-2" />
            Thibitisha Marekebisho
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
