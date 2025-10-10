import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CameraScanner } from '@/components/CameraScanner';
import { PaymentMethodDialog } from '@/components/PaymentMethodDialog';
import { EnhancedReceiptPrinter } from '@/components/EnhancedReceiptPrinter';
import { WeightSelector } from '@/components/WeightSelector';
import { DigitalReceiptService } from '@/components/DigitalReceiptService';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock_quantity: number;
  category: string;
  is_weight_based?: boolean;
}

interface CartItem extends Product {
  quantity: number;
  weightInfo?: { weight: number; unit: string; totalPrice: number };
}

interface PaymentData {
  method: 'cash' | 'mobile' | 'bank';
  provider?: string;
  phoneNumber?: string;
  accountNumber?: string;
  transactionId?: string;
}

export const ScannerPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'barcode' | 'name'>('barcode');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDigitalReceipt, setShowDigitalReceipt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showWeightSelector, setShowWeightSelector] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [completedSale, setCompletedSale] = useState<{
    id: string;
    items: any[];
    subtotal: number;
    vatAmount: number;
    total: number;
    paymentData: PaymentData;
    businessName: string;
  } | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const handleSearchProduct = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Searching for products with user ID:', user.id);
      let searchQuery;
      
      if (searchType === 'barcode') {
        searchQuery = supabase
          .from('products')
          .select('*')
          .eq('barcode', query.trim())
          .eq('owner_id', user.id);
      } else {
        searchQuery = supabase
          .from('products')
          .select('*')
          .ilike('name', `%${query.trim()}%`)
          .eq('owner_id', user.id)
          .limit(10);
      }

      const { data, error } = await searchQuery;

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      console.log('Search results:', data);

      if (searchType === 'barcode') {
        if (data && data.length > 0) {
          setScannedProduct(data[0]);
          setSearchResults([]);
          toast({
            title: 'Product Found!',
            description: `${data[0].name} - TZS ${data[0].price.toLocaleString()}`
          });
        } else {
          toast({
            title: 'Product Not Found',
            description: 'No product found with this barcode',
            variant: 'destructive'
          });
          setScannedProduct(null);
          setSearchResults([]);
        }
      } else {
        setSearchResults(data || []);
        setScannedProduct(null);
        if (data && data.length > 0) {
          toast({
            title: 'Products Found',
            description: `${data.length} product(s) found`
          });
        } else {
          toast({
            title: 'No Products Found',
            description: 'No products match your search',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to search product. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = (barcode: string) => {
    setSearchQuery(barcode);
    setSearchType('barcode');
    setShowCamera(false);
    handleSearchProduct(barcode);
  };

  const selectProduct = (product: Product) => {
    setScannedProduct(product);
    setSearchResults([]);
    setSearchQuery('');
  };

  const addToCart = (product: Product) => {
    // Check if this is a weight-based product using the database field
    if (product.is_weight_based) {
      setSelectedProductForWeight(product);
      setShowWeightSelector(true);
      return;
    }

    if (product.stock_quantity <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock',
        variant: 'destructive'
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({
          title: 'Insufficient Stock',
          description: 'Cannot add more items than available in stock',
          variant: 'destructive'
        });
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast({
      title: 'Added to Cart',
      description: `${product.name} added to cart`
    });
  };

  const handleWeightBasedAddToCart = (product: Product, weightData: { weight: number; unit: string; totalPrice: number }) => {
    const cartItem = {
      ...product,
      quantity: weightData.weight,
      price: weightData.totalPrice / weightData.weight,
      weightInfo: weightData
    };

    setCart(prev => [...prev, cartItem]);
    
    toast({
      title: 'Added to Cart',
      description: `${weightData.weight}${weightData.unit} ${product.name} - TZS ${weightData.totalPrice.toLocaleString()}`
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, Math.min(item.stock_quantity, item.quantity + change));
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalAmount = () => {
    return getSubtotal();
  };

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: user?.id,
          cashier_id: user?.id,
          total_amount: getSubtotal(),
          payment_method: paymentData.method
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('sales_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Stock is now handled automatically by the database trigger after inserting sale_items
      console.log('Stock will be updated automatically by database trigger');

      const receiptItems = cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      }));

      setCompletedSale({
        id: sale.id.slice(0, 8),
        items: receiptItems,
        subtotal: getSubtotal(),
        vatAmount: 0,
        total: getSubtotal(),
        paymentData,
        businessName: userProfile?.business_name || 'KIDUKA STORE'
      });

      toast({
        title: 'Sale Completed!',
        description: `Total: TZS ${getSubtotal().toLocaleString()}`
      });
      
      setShowPayment(false);
      setShowReceipt(true);
      setCart([]);
      setScannedProduct(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error completing sale:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete sale',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintComplete = () => {
    setShowReceipt(false);
    setShowDigitalReceipt(true);
  };

  const handleDigitalReceiptClose = () => {
    setShowDigitalReceipt(false);
    setCompletedSale(null);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Scanner</h2>
        <p className="text-gray-600">Search products by barcode or name</p>
      </div>

      {/* Camera Scanner Component */}
      <CameraScanner
        isOpen={showCamera}
        onScan={handleCameraScan}
        onClose={() => setShowCamera(false)}
      />

      {/* Weight Selector Modal */}
      {showWeightSelector && selectedProductForWeight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <WeightSelector
            product={selectedProductForWeight}
            onAddToCart={handleWeightBasedAddToCart}
            onClose={() => {
              setShowWeightSelector(false);
              setSelectedProductForWeight(null);
            }}
          />
        </div>
      )}

      {/* Payment Modal */}
      <PaymentMethodDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        totalAmount={getSubtotal()} 
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-center">Sale Complete!</h3>
            <EnhancedReceiptPrinter
              items={completedSale.items}
              subtotal={completedSale.subtotal}
              vatAmount={completedSale.vatAmount}
              total={completedSale.total}
              transactionId={completedSale.id}
              paymentData={completedSale.paymentData}
              businessName={completedSale.businessName}
              onPrint={handlePrintComplete}
            />
            <Button 
              onClick={handlePrintComplete}
              variant="outline"
              className="w-full mt-4"
            >
              Continue to Digital Receipt
            </Button>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {showDigitalReceipt && completedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <DigitalReceiptService
            receiptData={{
              transactionId: completedSale.id,
              items: completedSale.items,
              subtotal: completedSale.subtotal,
              vatAmount: completedSale.vatAmount,
              total: completedSale.total,
              paymentData: completedSale.paymentData,
              businessName: completedSale.businessName
            }}
            onClose={handleDigitalReceiptClose}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Product Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Type Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={searchType === "barcode" ? "default" : "outline"}
                  onClick={() => setSearchType("barcode")}
                  className="flex-1"
                >
                  Barcode
                </Button>
                <Button
                  variant={searchType === "name" ? "default" : "outline"}
                  onClick={() => setSearchType("name")}
                  className="flex-1"
                >
                  Name
                </Button>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder={searchType === 'barcode' ? "Enter barcode..." : "Enter product name..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchProduct(searchQuery)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSearchProduct(searchQuery)}
                    className="flex-1"
                    disabled={!searchQuery || loading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Searching...' : 'Search Product'}
                  </Button>
                  {searchType === 'barcode' && (
                    <Button 
                      onClick={() => setShowCamera(true)}
                      variant="outline"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results for Name Search */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Search Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {searchResults.map((product) => (
                  <div key={product.id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-blue-600 font-bold">TZS {product.price.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-blue-600 mb-2">
                          Stock: {product.stock_quantity}
                        </Badge>
                        <Button 
                          onClick={() => selectProduct(product)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Scanned Product */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Product Selected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{scannedProduct.name}</h3>
                    <p className="text-green-600 font-bold text-xl">TZS {scannedProduct.price.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-blue-600">
                      Stock: {scannedProduct.stock_quantity}
                    </Badge>
                    <Button 
                      onClick={() => addToCart(scannedProduct)}
                      disabled={scannedProduct.stock_quantity <= 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Shopping Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Cart is empty</p>
                <p className="text-sm text-gray-500">Search products to add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        TZS {item.price.toLocaleString()} {item.weightInfo ? `per ${item.weightInfo.unit}` : 'each'}
                      </p>
                      {item.weightInfo && (
                        <p className="text-xs text-blue-600">Weight: {item.weightInfo.weight}{item.weightInfo.unit}</p>
                      )}
                    </div>
                    {!item.weightInfo && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8 p-0"
                          disabled={item.quantity >= item.stock_quantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-right ml-4">
                      <p className="font-bold">TZS {(item.price * item.quantity).toLocaleString()}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-xl font-bold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">TZS {getSubtotal().toLocaleString()}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowPayment(true)}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};