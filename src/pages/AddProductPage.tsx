import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Scan, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    category: '',
    description: '',
    low_stock_threshold: '10',
    image_url: ''
  });
  
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const generateBarcode = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_barcode_number');
      if (error) throw error;
      
      setFormData({...formData, barcode: data});
      toast({
        title: 'Barcode Generated',
        description: `Generated barcode: ${data}`
      });
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Fallback to client-side generation
      const barcode = '8' + Date.now().toString().slice(-11);
      setFormData({...formData, barcode});
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setImageUploading(true);
    try {
      // In a real implementation, you'd upload to Supabase Storage
      // For now, we'll create a data URL for demonstration
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({...formData, image_url: e.target?.result as string});
        setImageUploading(false);
        toast({
          title: 'Success',
          description: 'Image uploaded successfully'
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
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
          image_url: formData.image_url || null,
          generated_barcode: !formData.barcode,
          owner_id: userProfile?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product added successfully'
      });
      
      navigate('/products');
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Product</h2>
          <p className="text-gray-600">Create a new product for your inventory</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter product name"
                required
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label htmlFor="image">Product Image</Label>
              <div className="space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                />
                {imageUploading && <p className="text-sm text-blue-600">Uploading...</p>}
                {formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Product preview" 
                      className="h-20 w-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Scan or enter barcode"
                />
                <Button type="button" variant="outline" onClick={generateBarcode}>
                  Generate
                </Button>
                <Button type="button" variant="outline">
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Selling Price *</Label>
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
                <Label htmlFor="cost_price">Cost Price</Label>
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
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="threshold">Low Stock Threshold</Label>
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Electronics, Food, etc."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Product description (optional)"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
