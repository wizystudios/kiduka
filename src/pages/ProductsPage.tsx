import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Package, Loader2, Scale, ChevronDown, ChevronUp, ShoppingCart, FileSpreadsheet, Download, Store, WifiOff, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineProducts } from '@/hooks/useOfflineProducts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { WeightQuantitySelector } from '@/components/WeightQuantitySelector';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProductLocal {
  id: string;
  name: string;
  barcode?: string | null;
  price: number;
  stock_quantity: number;
  category?: string | null;
  description?: string | null;
  low_stock_threshold?: number | null;
  is_weight_based?: boolean | null;
  unit_type?: string | null;
  min_quantity?: number | null;
}

export const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<ProductLocal | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const navigate = useNavigate();
  const { dataOwnerId, isReady } = useDataAccess();
  
  // Use offline-first products hook
  const {
    products,
    loading,
    isOffline,
    deleteProduct,
    refreshProducts
  } = useOfflineProducts(isReady ? dataOwnerId : null);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    setRefreshing(false);
  };

  const handleAddProduct = () => {
    console.log('Navigating to add product page...');
    navigate('/products/add');
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!confirm(`Je, una uhakika unataka kufuta bidhaa "${productName}"?`)) return;

    if (!dataOwnerId) {
      toast.error('Hakuna data ya biashara.');
      return;
    }

    // Use the offline-first delete
    await deleteProduct(id);
  };

  const handleWeightProductSelect = (product: ProductLocal) => {
    setSelectedWeightProduct(product);
  };

  const handleAddToCart = (product: ProductLocal, quantity: number) => {
    toast.success(`Imeongezwa: ${quantity} ${product.unit_type} ya ${product.name}`);
  };

  const handleSellProduct = (product: ProductLocal) => {
    navigate('/scanner', { state: { selectedProduct: product } });
  };

  const exportToCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error('Hakuna bidhaa za kuexport');
      return;
    }
    const headers = ['name', 'barcode', 'price', 'cost_price', 'stock_quantity', 'category', 'description', 'low_stock_threshold', 'is_weight_based', 'unit_type', 'min_quantity'];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.barcode || '',
      p.price,
      0, // cost_price not in interface, default 0
      p.stock_quantity,
      p.category || '',
      p.description || '',
      p.low_stock_threshold,
      p.is_weight_based ? 'true' : 'false',
      p.unit_type || 'piece',
      p.min_quantity || 0.1,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV export imekamilika');
  };

  const exportToExcel = () => {
    if (filteredProducts.length === 0) {
      toast.error('Hakuna bidhaa za kuexport');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      filteredProducts.map((p) => ({
        Jina: p.name,
        Barcode: p.barcode || '',
        Bei: p.price,
        Stock: p.stock_quantity,
        Category: p.category || '',
        Maelezo: p.description || '',
        'Kiwango cha Chini': p.low_stock_threshold,
        'Inategemea Uzito': p.is_weight_based ? 'Ndiyo' : 'Hapana',
        Kipimo: p.unit_type || 'piece',
        'Kiasi cha Chini': p.min_quantity || 0.1,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel export imekamilika');
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
    return { color: 'bg-green-100 text-green-800', label: 'Ipo' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bidhaa</h2>
              <p className="text-xs text-gray-600">{products.length} bidhaa</p>
            </div>
          </div>
          
          {/* Offline Status Badge */}
          {isOffline && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
          {!isOffline && (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">
              <Cloud className="h-3 w-3 mr-1" />
              Online
            </Badge>
          )}
        </div>
        
        <div className="flex gap-1 w-full sm:w-auto">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sasisha'}
          </Button>
          <Button 
            onClick={exportToCSV}
            variant="outline"
            className="text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button 
            onClick={exportToExcel}
            variant="outline"
            className="text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Excel
          </Button>
          <Button 
            onClick={() => navigate('/products/import')}
            variant="outline"
            className="text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Ingiza
          </Button>
          <Button 
            onClick={handleAddProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-7 flex-1 sm:flex-none"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ongeza
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
        <Input
          placeholder="Tafuta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-7 text-xs h-7"
        />
      </div>

      {/* Products List */}
      <div className="space-y-1">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(
            product.stock_quantity || 0, 
            product.low_stock_threshold || 10
          );
          const isExpanded = expandedProduct === product.id;
          
          return (
            <Collapsible
              key={product.id}
              open={isExpanded}
              onOpenChange={() => setExpandedProduct(isExpanded ? null : product.id)}
            >
              <Card className="hover:shadow-sm transition-all">
                <CardContent className="p-2">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h3 className="font-semibold text-xs truncate">{product.name}</h3>
                          <Badge className={`${stockStatus.color} text-xs px-1 py-0`}>
                            {stockStatus.label}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-green-600">
                            {(product.price || 0).toLocaleString()} TZS
                          </span>
                          <span className="text-xs text-gray-600">
                            Stock: {product.stock_quantity || 0}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {/* Details */}
                      {product.barcode && (
                        <p className="text-xs text-gray-600">Barcode: {product.barcode}</p>
                      )}
                      {product.category && (
                        <p className="text-xs text-gray-600">Aina: {product.category}</p>
                      )}
                      {product.description && (
                        <p className="text-xs text-gray-600">{product.description}</p>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSellProduct(product);
                          }}
                          className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Uza
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/products/edit/${product.id}`);
                          }}
                          className="h-6 text-xs px-2"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Hariri
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id, product.name);
                          }}
                          className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Futa
                        </Button>
                        
                        {/* Auto-listed on Sokoni indicator */}
                        {product.stock_quantity > 0 && (
                          <Badge variant="secondary" className="h-6 text-xs px-2 bg-purple-100 text-purple-700 border-purple-300">
                            <Store className="h-3 w-3 mr-1" />
                            Sokoni
                          </Badge>
                        )}
                        
                        {product.is_weight_based && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWeightProductSelect(product);
                            }}
                            className="h-6 text-xs px-2"
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            Pima
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && (
        <Card className="text-center py-4 border-2 border-dashed">
          <CardContent>
            <Package className="h-6 w-6 text-gray-400 mx-auto mb-1" />
            <h3 className="text-xs font-semibold text-gray-900 mb-1">
              {searchTerm ? 'Hakuna bidhaa' : 'Hakuna bidhaa bado'}
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {searchTerm 
                ? `Hakuna "${searchTerm}"`
                : "Ongeza bidhaa"
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={handleAddProduct} 
                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ongeza Bidhaa
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Weight Quantity Selector Modal */}
      {selectedWeightProduct && (
        <WeightQuantitySelector
          product={selectedWeightProduct}
          onClose={() => setSelectedWeightProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
};
