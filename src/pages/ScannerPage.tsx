
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
import { DigitalReceiptService } from '@/components/DigitalReceiptService';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock_quantity: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface PaymentData {
  method: 'cash' | 'mobile' | 'bank';
  provider?: string;
  phoneNumber?: string;
  accountNumber?: string;
  transactionId?: string;
}

export const ScannerPage = () => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDigitalReceipt, setShowDigitalReceipt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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
  const { userProfile } = useAuth();

  const handleSearchProduct = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode.trim())
        .single();

      if (error) {
        toast({
          title: 'Product Not Found',
          description: 'No product found with this barcode',
          variant: 'destructive'
        });
        setScannedProduct(null);
        return;
      }

      setScannedProduct(data);
      toast({
        title: 'Product Found!',
        description: `${data.name} - TZS ${data.price.toLocaleString()}`
      });
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to search product',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = (barcode: string) => {
    setManualBarcode(barcode);
    setShowCamera(false);
    handleSearchProduct(barcode);
  };

  const addToCart = (product: Product) => {
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

  const getVatAmount = () => {
    return getSubtotal() * 0.18;
  };

  const getTotalAmount = () => {
    return getSubtotal() + getVatAmount();
  };

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: userProfile?.id,
          cashier_id: userProfile?.id,
          total_amount: getTotalAmount(),
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
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

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
        vatAmount: getVatAmount(),
        total: getTotalAmount(),
        paymentData,
        businessName: userProfile?.business_name || 'KIDUKA STORE'
      });

      toast({
        title: 'Sale Completed!',
        description: `Total: TZS ${getTotalAmount().toLocaleString()}`
      });
      
      setShowPayment(false);
      setShowReceipt(true);
      setCart([]);
      setScannedProduct(null);
      setManualBarcode('');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Barcode Scanner</h2>
        <p className="text-gray-600">Scan or search products to add to sale</p>
      </div>

      {/* Camera Scanner Component */}
      <CameraScanner
        isOpen={showCamera}
        onScan={handleCameraScan}
        onClose={() => setShowCamera(false)}
      />

      {/* Payment Modal */}
      <PaymentMethodDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        totalAmount={getTotalAmount()}
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
                <Camera className="h-5 w-5 mr-2" />
                Product Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Enter barcode manually..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchProduct(manualBarcode)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSearchProduct(manualBarcode)}
                    className="flex-1"
                    disabled={!manualBarcode || loading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Searching...' : 'Search Product'}
                  </Button>
                  <Button 
                    onClick={() => setShowCamera(true)}
                    variant="outline"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scanned Product */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Product Found</CardTitle>
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
                <p className="text-sm text-gray-500">Scan products to add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">TZS {item.price.toLocaleString()} each</p>
                    </div>
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
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>TZS {getSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT (18%):</span>
                      <span>TZS {getVatAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-xl font-bold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">TZS {getTotalAmount().toLocaleString()}</span>
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
