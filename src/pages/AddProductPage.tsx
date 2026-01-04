import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';

export const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
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
    min_quantity: '0.1'
  });
  
  const navigate = useNavigate();
  const { dataOwnerId, loading: dataLoading } = useDataAccess();

  const generateBarcode = () => {
    const barcode = '8' + Date.now().toString().slice(-11);
    setFormData({...formData, barcode});
    toast.success(`Barcode iliyozalishwa: ${barcode}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      toast.error('Tafadhali jaza sehemu zote muhimu');
      return;
    }

    if (!dataOwnerId) {
      toast.error('Hakuna data ya biashara. Jaribu tena.');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding product for dataOwnerId:', dataOwnerId);
      
      let barcodeToUse = formData.barcode;
      if (!barcodeToUse) {
        barcodeToUse = '8' + Date.now().toString().slice(-11);
      }
      
      const productData = {
        name: formData.name.trim(),
        barcode: barcodeToUse,
        price: parseFloat(formData.price),
        stock_quantity: parseFloat(formData.stock_quantity),
        category: formData.category?.trim() || null,
        description: formData.description?.trim() || null,
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        is_weight_based: formData.is_weight_based,
        unit_type: formData.unit_type,
        min_quantity: parseFloat(formData.min_quantity) || 0.1,
        owner_id: dataOwnerId
      };

      console.log('Inserting product:', productData);
      
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        if (error.code === '23505') {
          toast.error('Barcode tayari imetumiwa. Tafadhali tumia barcode tofauti');
        } else {
          toast.error('Imeshindwa kuongeza bidhaa: ' + error.message);
        }
        return;
      }

      console.log('Product added successfully:', data);
      toast.success('Bidhaa imeongezwa kwa mafanikio');
      
      setFormData({
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
        min_quantity: '0.1'
      });
      
      navigate('/products');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error('Imeshindwa kuongeza bidhaa: ' + (error.message || 'Kosa la kutarajwa'));
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-3 pb-16">
      <div className="flex items-center gap-2 mb-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/products')}
          className="h-8 w-8 p-0"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Ongeza Bidhaa</h2>
          <p className="text-xs text-muted-foreground">Unda bidhaa mpya</p>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Maelezo ya Bidhaa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-xs">Jina la Bidhaa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ingiza jina la bidhaa"
                className="text-sm h-8"
                required
              />
            </div>

            <div>
              <Label htmlFor="barcode" className="text-xs">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Ingiza au zalisha barcode"
                  className="text-sm h-8"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateBarcode}
                  className="text-xs px-2 h-8"
                  disabled={loading}
                >
                  Zalisha
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="price" className="text-xs">Bei ya Mauzo *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  className="text-sm h-8"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cost_price" className="text-xs">Bei ya Ununuzi</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                  placeholder="0.00"
                  className="text-sm h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="stock" className="text-xs">Idadi ya Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  step={formData.is_weight_based ? "0.1" : "1"}
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  placeholder="0"
                  className="text-sm h-8"
                  required
                />
              </div>
              <div>
                <Label htmlFor="threshold" className="text-xs">Kiwango cha Stock Ndogo</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                  placeholder="10"
                  className="text-sm h-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="text-xs">Kategoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Elektroniki, Chakula, n.k."
                className="text-sm h-8"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs">Maelezo</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Maelezo ya bidhaa (si lazima)"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="is_weight_based"
                  checked={formData.is_weight_based}
                  onChange={(e) => setFormData({...formData, is_weight_based: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_weight_based" className="text-xs font-medium">
                  Bidhaa hii inazwa kwa uzito/kipimo (kg, lita, n.k.)
                </Label>
              </div>
              
              {formData.is_weight_based && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="unit_type" className="text-xs">Aina ya Kipimo</Label>
                    <Select value={formData.unit_type} onValueChange={(value) => setFormData({...formData, unit_type: value})}>
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label htmlFor="min_quantity" className="text-xs">Kiwango cha Chini</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      step="0.1"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                      placeholder="0.1"
                      className="text-sm h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                className="flex-1 text-xs h-8"
                disabled={loading}
              >
                Ghairi
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 text-xs h-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Inahifadhi...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Hifadhi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};