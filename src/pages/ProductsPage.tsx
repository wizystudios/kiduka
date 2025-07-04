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
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const fetchProducts = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setLoading(false);
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
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log('User available, fetching products...');
      setLoading(true);
      fetchProducts();
    } else if (user === null) {
      console.log('No user logged in');
      setLoading(false);
    }
  }, [user?.id]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Inapakia bidhaa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">Bidhaa</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-600">{products.length} bidhaa katika hifadhi</p>
            {refreshing && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            Sasisha
          </Button>
          
          {userProfile?.role === 'owner' && (
            <Button 
              onClick={() => navigate('/products/add')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ongeza Bidhaa
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
        <Input
          placeholder="Tafuta kwa jina, barcode, au kategoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-7 text-xs h-8"
        />
      </div>

      {/* Products List */}
      <div className="space-y-2">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(
            product.stock_quantity || 0, 
            product.low_stock_threshold || 10
          );
          return (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-2.5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-xs truncate">{product.name}</h3>
                      <Badge className={`${stockStatus.color} text-xs px-1 py-0.5 flex-shrink-0`}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                    {product.barcode && (
                      <p className="text-xs text-gray-500 mb-0.5">Barcode: {product.barcode}</p>
                    )}
                    {product.category && (
                      <p className="text-xs text-gray-500 mb-0.5">Kategoria: {product.category}</p>
                    )}
                    {product.description && (
                      <p className="text-xs text-gray-600 mb-1 truncate">{product.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-green-600">
                        TZS {(product.price || 0).toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Package className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          Stock: {product.stock_quantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {userProfile?.role === 'owner' && (
                    <div className="flex space-x-1 ml-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="h-5 w-5 p-0 hover:bg-blue-50"
                        title="Hariri bidhaa"
                      >
                        <Edit className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Futa bidhaa"
                      >
                        <Trash2 className="h-3 w-3" />
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
      {filteredProducts.length === 0 && !loading && (
        <Card className="text-center py-6">
          <CardContent>
            <Package className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-gray-900 mb-1">
              {searchTerm ? 'Hakuna bidhaa zilizopatikana' : 'Hakuna bidhaa bado'}
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {searchTerm 
                ? `Hakuna bidhaa zinazofanana na "${searchTerm}". Jaribu maneno mengine ya utafutaji.`
                : "Anza kwa kuongeza bidhaa yako ya kwanza"
              }
            </p>
            {userProfile?.role === 'owner' && !searchTerm && (
              <Button onClick={() => navigate('/products/add')} className="text-xs px-3 py-1 h-7">
                <Plus className="h-3 w-3 mr-1" />
                Ongeza Bidhaa
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
