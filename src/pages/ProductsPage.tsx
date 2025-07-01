
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock_quantity: number;
  category: string;
  description: string;
  low_stock_threshold: number;
}

export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (user && userProfile) {
      fetchProducts();
    }
  }, [user, userProfile]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products for user:', user?.id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Imeshindwa kupakia bidhaa');
      } else {
        console.log('Products loaded:', data?.length || 0);
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      toast.error('Kosa la kutarajwa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Je, una uhakika unataka kufuta bidhaa hii?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
      toast.success('Bidhaa imefutwa kwa mafanikio');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Imeshindwa kufuta bidhaa');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock <= threshold) return { color: 'bg-red-100 text-red-800', label: 'Stock Ndogo' };
    if (stock <= threshold * 2) return { color: 'bg-yellow-100 text-yellow-800', label: 'Wastani' };
    return { color: 'bg-green-100 text-green-800', label: 'Ipo Stock' };
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Inapakia bidhaa...</p>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bidhaa</h2>
          <p className="text-gray-600">{products.length} bidhaa katika hifadhi</p>
        </div>
        
        {userProfile?.role === 'owner' && (
          <Button 
            onClick={() => navigate('/products/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ongeza Bidhaa
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tafuta kwa jina, barcode, au kategoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
          return (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <Badge className={stockStatus.color}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                    {product.barcode && (
                      <p className="text-sm text-gray-500 mb-1">Barcode: {product.barcode}</p>
                    )}
                    {product.category && (
                      <p className="text-sm text-gray-500 mb-2">Kategoria: {product.category}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-600">TZS {product.price.toLocaleString()}</span>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Stock: {product.stock_quantity}</span>
                      </div>
                    </div>
                  </div>
                  
                  {userProfile?.role === 'owner' && (
                    <div className="flex space-x-1 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna bidhaa zilizopatikana</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Jaribu kubadilisha maneno ya utafutaji" : "Anza kwa kuongeza bidhaa yako ya kwanza"}
            </p>
            {userProfile?.role === 'owner' && !searchTerm && (
              <Button onClick={() => navigate('/products/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Bidhaa
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
