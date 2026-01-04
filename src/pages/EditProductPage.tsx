
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Scan } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProductImageUpload } from '@/components/ProductImageUpload';

export const EditProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    category: '',
    description: '',
    low_stock_threshold: '10',
    is_weight_based: false,
    unit_type: 'piece',
    min_quantity: '0.1',
    image_url: null as string | null
  });
  
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || '',
        barcode: data.barcode || '',
        price: data.price?.toString() || '',
        cost_price: data.cost_price?.toString() || '',
        stock_quantity: data.stock_quantity?.toString() || '',
        category: data.category || '',
        description: data.description || '',
        low_stock_threshold: data.low_stock_threshold?.toString() || '10',
        is_weight_based: data.is_weight_based || false,
        unit_type: data.unit_type || 'piece',
        min_quantity: data.min_quantity?.toString() || '0.1',
        image_url: data.image_url || null
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive'
      });
      navigate('/products');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza sehemu zote muhimu',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Updating product:', id, formData);
      
      const updateData = {
        name: formData.name.trim(),
        barcode: formData.barcode?.trim() || null,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock_quantity: parseFloat(formData.stock_quantity),
        category: formData.category?.trim() || null,
        description: formData.description?.trim() || null,
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        is_weight_based: formData.is_weight_based,
        unit_type: formData.unit_type,
        min_quantity: parseFloat(formData.min_quantity) || 0.1,
        image_url: formData.image_url,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        if (error.code === '23505') {
          toast({
            title: 'Hitilafu',
            description: 'Barcode tayari imetumiwa. Tafadhali tumia barcode tofauti',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      console.log('Product updated successfully:', data);
      toast({
        title: 'Mafanikio',
        description: 'Bidhaa imesasishwa kwa mafanikio'
      });
      
      navigate('/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kusasisha bidhaa: ' + (error.message || 'Kosa la kutarajwa'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="p-4">
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hariri Bidhaa</h2>
          <p className="text-gray-600">Sasisha maelezo ya bidhaa</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maelezo ya Bidhaa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Image Upload */}
            <ProductImageUpload
              currentImageUrl={formData.image_url}
              onImageChange={(url) => setFormData({...formData, image_url: url})}
              productId={id}
            />
            
            <div>
              <Label htmlFor="name">Jina la Bidhaa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ingiza jina la bidhaa"
                required
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Ingiza au scan barcode"
                />
                <Button type="button" variant="outline">
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Bei ya Mauzo *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cost_price">Bei ya Ununuzi</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock">Idadi ya Stock *</Label>
                 <Input
                   id="stock"
                   type="number"
                   step={formData.is_weight_based ? "0.1" : "1"}
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="threshold">Kiwango cha Stock Ndogo</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Kategoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Elektroniki, Chakula, n.k."
              />
            </div>

            <div>
              <Label htmlFor="description">Maelezo</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Maelezo ya bidhaa (si lazima)"
                rows={3}
              />
            </div>

            {/* Weight-Based Product Settings */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="is_weight_based"
                  checked={formData.is_weight_based}
                  onChange={(e) => setFormData({...formData, is_weight_based: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_weight_based" className="font-medium">
                  Bidhaa hii inazwa kwa uzito/kipimo (kg, lita, n.k.)
                </Label>
              </div>
              
              {formData.is_weight_based && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit_type">Aina ya Kipimo</Label>
                    <Select value={formData.unit_type} onValueChange={(value) => setFormData({...formData, unit_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chagua kipimo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilogramu (kg)</SelectItem>
                        <SelectItem value="g">Gramu (g)</SelectItem>
                        <SelectItem value="ltr">Lita (ltr)</SelectItem>
                        <SelectItem value="ml">Millilita (ml)</SelectItem>
                        <SelectItem value="piece">Kipande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="min_quantity">Kiwango cha Chini</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      step="0.1"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                      placeholder="0.1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                className="flex-1"
              >
                Ghairi
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Inasasisha...' : 'Sasisha Bidhaa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
