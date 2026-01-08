import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/utils/offlineDatabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string | null;
  category?: string | null;
  description?: string | null;
  owner_id: string;
  cost_price?: number | null;
  low_stock_threshold?: number | null;
  is_weight_based?: boolean | null;
  unit_type?: string | null;
  min_quantity?: number | null;
  image_url?: string | null;
  is_archived?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface UseOfflineProductsResult {
  products: Product[];
  loading: boolean;
  isOffline: boolean;
  createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  refreshProducts: () => Promise<void>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  searchProducts: (query: string) => Promise<Product[]>;
}

export const useOfflineProducts = (ownerId: string | null): UseOfflineProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load products from local or remote
  const loadProducts = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (navigator.onLine) {
        // Online: fetch from Supabase and cache locally
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('owner_id', ownerId)
          .order('name');

        if (error) throw error;

        if (data) {
          setProducts(data);
          // Cache in IndexedDB
          await offlineDB.saveMany('products', data, false);
          console.log(`Cached ${data.length} products for offline use`);
        }
      } else {
        // Offline: load from IndexedDB
        const localProducts = await offlineDB.getAll<Product>('products', ownerId);
        setProducts(localProducts.sort((a, b) => a.name.localeCompare(b.name)));
        console.log(`Loaded ${localProducts.length} products from offline cache`);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      
      // Fallback to offline data on error
      try {
        const localProducts = await offlineDB.getAll<Product>('products', ownerId);
        setProducts(localProducts.sort((a, b) => a.name.localeCompare(b.name)));
        toast.info('Inapakia data kutoka cache ya offline');
      } catch (offlineError) {
        console.error('Error loading offline products:', offlineError);
        toast.error('Imeshindwa kupakia bidhaa');
      }
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  // Create product
  const createProduct = useCallback(async (
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product | null> => {
    if (!ownerId) return null;

    const newProduct: Product = {
      ...productData,
      id: crypto.randomUUID(),
      owner_id: ownerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (navigator.onLine) {
        // Online: save to Supabase first
        const { data, error } = await supabase
          .from('products')
          .insert({
            ...productData,
            owner_id: ownerId
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state and cache
        setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        await offlineDB.save('products', data, false);
        
        toast.success('Bidhaa imeongezwa!');
        return data;
      } else {
        // Offline: save locally with sync queue
        await offlineDB.save('products', newProduct, true);
        setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
        
        toast.success('Bidhaa imehifadhiwa offline. Itasawazishwa baadaye.');
        
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'upload',
          table: 'products',
          itemCount: 1,
          status: 'success',
          details: `Bidhaa "${newProduct.name}" imehifadhiwa offline`
        });
        
        return newProduct;
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(`Imeshindwa kuongeza bidhaa: ${error.message || 'Unknown error'}`);
      return null;
    }
  }, [ownerId]);

  // Update product
  const updateProduct = useCallback(async (
    id: string,
    updates: Partial<Product>
  ): Promise<boolean> => {
    try {
      const existingProduct = products.find(p => p.id === id);
      if (!existingProduct) {
        toast.error('Bidhaa haipatikani');
        return false;
      }

      const updatedProduct: Product = {
        ...existingProduct,
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (navigator.onLine) {
        // Online: update in Supabase
        const { error } = await supabase
          .from('products')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('owner_id', existingProduct.owner_id);

        if (error) throw error;

        // Update local state and cache
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
        await offlineDB.save('products', updatedProduct, false);
        
        toast.success('Bidhaa imesasishwa!');
      } else {
        // Offline: save locally with sync queue
        await offlineDB.save('products', updatedProduct, true);
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
        
        toast.success('Mabadiliko yamehifadhiwa offline. Yatasawazishwa baadaye.');
        
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'upload',
          table: 'products',
          itemCount: 1,
          status: 'success',
          details: `Bidhaa "${updatedProduct.name}" imebadilishwa offline`
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(`Imeshindwa kusasisha bidhaa: ${error.message || 'Unknown error'}`);
      return false;
    }
  }, [products]);

  // Delete product
  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const existingProduct = products.find(p => p.id === id);
      if (!existingProduct) {
        toast.error('Bidhaa haipatikani');
        return false;
      }

      if (navigator.onLine) {
        // Online: delete from Supabase
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .eq('owner_id', existingProduct.owner_id);

        if (error) {
          console.error('Delete product error:', error);
          
          // Check for foreign key constraint errors
          if (error.code === '23503' || error.message?.includes('violates foreign key constraint')) {
            toast.error('Bidhaa hii haiwezi kufutwa kwa sababu imeshauzwa au ina historia ya mabadiliko ya stock. Badala yake, weka stock = 0.');
            return false;
          }
          
          // Check for RLS policy errors
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            toast.error('Huna ruhusa ya kufuta bidhaa hii');
            return false;
          }
          
          throw error;
        }

        // Update local state and cache
        setProducts(prev => prev.filter(p => p.id !== id));
        await offlineDB.delete('products', id, false);
        
        toast.success('Bidhaa imefutwa!');
      } else {
        // Offline: delete locally with sync queue
        await offlineDB.delete('products', id, true);
        setProducts(prev => prev.filter(p => p.id !== id));
        
        toast.success('Bidhaa imefutwa offline. Itasawazishwa baadaye.');
        
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'upload',
          table: 'products',
          itemCount: 1,
          status: 'success',
          details: `Bidhaa "${existingProduct.name}" imefutwa offline`
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(`Imeshindwa kufuta bidhaa: ${error.message || 'Kosa lisilojulikana'}`);
      return false;
    }
  }, [products]);

  // Get product by barcode
  const getProductByBarcode = useCallback(async (barcode: string): Promise<Product | null> => {
    // First check local cache
    const localProduct = products.find(p => p.barcode === barcode);
    if (localProduct) return localProduct;

    // If online, also check Supabase in case cache is stale
    if (navigator.onLine && ownerId) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', barcode)
          .eq('owner_id', ownerId)
          .maybeSingle();

        if (!error && data) {
          // Update cache
          await offlineDB.save('products', data, false);
          return data;
        }
      } catch (error) {
        console.error('Error fetching product by barcode:', error);
      }
    }

    return null;
  }, [products, ownerId]);

  // Search products
  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    const lowerQuery = query.toLowerCase();
    
    // Search in local state (already loaded)
    const results = products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.barcode?.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery)
    );

    return results;
  }, [products]);

  return {
    products,
    loading,
    isOffline,
    createProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    getProductByBarcode,
    searchProducts
  };
};
