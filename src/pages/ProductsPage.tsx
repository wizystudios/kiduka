import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  barcode?: string;
  price: number;
  stock_quantity: number;
  category?: string;
  description?: string;
  low_stock_threshold: number;
}

export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchComplete, setFetchComplete] = useState(false);
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const fetchProducts = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setLoading(false);
      setFetchComplete(true);
      return;
    }

    try {
      console.log('Fetching products for user:', user.id);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Imeshindwa kupakia bidhaa');
        setProducts([]);
      } else {
        console.log('Products loaded successfully:', data?.length || 0);
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      toast.error('Kosa la kutarajwa');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFetchComplete(true);
    }
  };

  useEffect(() => {
    if (user?.id && userProfile) {
      console.log('Starting product fetch...');
      fetchProducts();
    } else if (user === null) {
      // User is definitely not logged in
      console.log('No user found, stopping loading');
      setLoading(false);
      setFetchComplete(true);
    }
    // If user is undefined, keep loading (still checking auth state)
  }, [user?.id, userProfile?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!confirm(`Je, una uhakika unataka kufuta bidhaa "${productName}"? Hii haitaweza kubadilishwa.`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Bidhaa imefutwa kwa mafanikio');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Imeshindwa kufuta bidhaa');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const searchLower = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  }, [products, searchTerm]);

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock <= 0) return { color: 'bg-red-100 text-red-800', label: 'Hazipatikani' };
    if (stock <= threshold) return { color: 'bg-red-100 text-red-800', label: 'Stock Ndogo' };
    if (stock <= threshold * 2) return { color: 'bg-yellow-100 text-yellow-800', label: 'Wastani' };
    return { color: 'bg-green-100 text-green-800', label: 'Ipo Stock' };
  };

  // Show loading only while checking authentication or fetching products
  if (loading && !fetchComplete) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {user ? 'Inapakia bidhaa...' : 'Inapakia...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bidhaa</h2>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">{products.length} bidhaa katika hifadhi</p>
            {refreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Sasisha
          </Button>
          
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
          const stockStatus = getStockStatus(
            product.stock_quantity || 0, 
            product.low_stock_threshold || 10
          );
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
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-600">
                        TZS {(product.price || 0).toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Stock: {product.stock_quantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {userProfile?.role === 'owner' && (
                    <div className="flex space-x-1 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                        title="Hariri bidhaa"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Futa bidhaa"
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

      {/* Empty State */}
      {filteredProducts.length === 0 && fetchComplete && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Hakuna bidhaa zilizopatikana' : 'Hakuna bidhaa bado'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `Hakuna bidhaa zinazofanana na "${searchTerm}". Jaribu maneno mengine ya utafutaji.`
                : "Anza kwa kuongeza bidhaa yako ya kwanza"
              }
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
