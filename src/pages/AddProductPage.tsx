
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
    low_stock_threshold: '10'
  });
  
  const navigate = useNavigate();
  const { user } = useAuth();

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

    if (!user?.id) {
      toast.error('Hitilafu ya uthibitishaji');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding product for user:', user.id);
      
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          barcode: formData.barcode || null,
          price: parseFloat(formData.price),
          cost_price: parseFloat(formData.cost_price) || 0,
          stock_quantity: parseInt(formData.stock_quantity),
          category: formData.category || null,
          description: formData.description || null,
          low_stock_threshold: parseInt(formData.low_stock_threshold),
          owner_id: user.id
        });

      if (error) {
        console.error('Error adding product:', error);
        throw error;
      }

      toast.success('Bidhaa imeongezwa kwa mafanikio');
      navigate('/products');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Imeshindwa kuongeza bidhaa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 space-y-3 pb-16">
      {/* Header */}
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
          <h2 className="text-lg font-bold text-gray-900">Ongeza Bidhaa</h2>
          <p className="text-xs text-gray-600">Unda bidhaa mpya</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Maelezo ya Bidhaa</CardTitle>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-8"
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
