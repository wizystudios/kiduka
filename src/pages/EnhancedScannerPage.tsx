import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Plus, Minus, ShoppingCart, Trash2, User, Percent, Calculator } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { PaymentMethodDialog } from '@/components/PaymentMethodDialog';
import { EnhancedReceiptPrinter } from '@/components/EnhancedReceiptPrinter';
import { DigitalReceiptService } from '@/components/DigitalReceiptService';
import { WeightQuantitySelector } from '@/components/WeightQuantitySelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { offlineStorage } from '@/utils/offlineStorage';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string;
  cost_price?: number;
  is_weight_based?: boolean;
  unit_type?: string;
  min_quantity?: number;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  loyalty_points?: number;
}

interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
}

interface PaymentData {
  method: 'cash' | 'mobile' | 'bank';
  provider?: string;
  phoneNumber?: string;
  accountNumber?: string;
  transactionId?: string;
}

export const EnhancedScannerPage = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDigitalReceipt, setShowDigitalReceipt] = useState(false);
  const [showWeightSelector, setShowWeightSelector] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [currentReceiptData, setCurrentReceiptData] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedDiscount, setSelectedDiscount] = useState<string>('');
  const [vatRate] = useState(18); // 18% VAT for Tanzania
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch customers only (no loyalty points column in schema)
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      setCustomers(customersData || []);
      setDiscounts([]);
      setBusinessSettings(null);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const addProductToCart = async (barcode: string) => {
    setLoading(true);
    try {
      let product: Product | null = null;

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, stock_quantity, barcode, is_weight_based, unit_type, min_quantity')
          .eq('barcode', barcode)
          .eq('owner_id', userProfile?.id)
          .single();

        if (!error && data) {
          product = data;
        }
      } else {
        const offlineProducts = offlineStorage.getOfflineProducts();
        product = offlineProducts.find(p => p.barcode === barcode) || null;
      }

      if (!product) {
        toast({
          title: 'Product not found',
          description: `No product found with barcode: ${barcode}`,
          variant: 'destructive'
        });
        return;
      }

      // Check if this is a weight-based product
      if (product.is_weight_based) {
        setSelectedProductForWeight(product);
        setShowWeightSelector(true);
        return;
      }

      if (product.stock_quantity <= 0) {
        toast({
          title: 'Out of stock',
          description: `${product.name} is out of stock`,
          variant: 'destructive'
        });
        return;
      }

      const existingItem = cart.find(item => item.id === product.id);
      
      if (existingItem) {
        // For regular products, check against whole number stock
        if (existingItem.quantity >= product.stock_quantity) {
          toast({
            title: 'Insufficient stock',
            description: `Only ${product.stock_quantity} items available`,
            variant: 'destructive'
          });
          return;
        }
        // Increment by exactly 1 for regular products
        const newQuantity = existingItem.quantity + 1;
        updateCartItemQuantity(product.id, newQuantity);
      } else {
        // Add new product with quantity 1
        const cartItem: CartItem = {
          ...product,
          quantity: 1,
          total: product.price
        };
        setCart([...cart, cartItem]);
        
        console.log(`Added new product: ${product.name}, quantity: 1`);
      }

      toast({
        title: 'Product added',
        description: `${product.name} added to cart`
      });
    } catch (error) {
      console.error('Error adding product to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product to cart',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWeightProductAdd = (product: Product, quantity: number) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // For weight-based products, add to existing quantity
      const newQuantity = existingItem.quantity + quantity;
      const newTotal = newQuantity * product.price;
      
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: newQuantity, total: newTotal }
          : item
      ));
    } else {
      const cartItem: CartItem = {
        ...product,
        quantity: quantity,
        total: quantity * product.price
      };
      setCart([...cart, cartItem]);
    }
    
    setShowWeightSelector(false);
    setSelectedProductForWeight(null);
    
    toast({
      title: 'Product added',
      description: `${quantity} ${product.unit_type || 'units'} of ${product.name} added to cart`
    });
  };
  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        // For weight-based products, allow decimal quantities
        const maxQuantity = item.is_weight_based ? 999999 : Math.floor(item.stock_quantity);
        const quantity = Math.min(newQuantity, maxQuantity);
        return {
          ...item,
          quantity,
          total: quantity * item.price
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    
    let discountAmount = 0;
    if (selectedDiscount) {
      const discount = discounts.find(d => d.id === selectedDiscount);
      if (discount) {
        if (discount.type === 'percentage') {
          discountAmount = (subtotal * discount.value) / 100;
        } else {
          discountAmount = Math.min(discount.value, subtotal);
        }
      }
    }
    
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = (afterDiscount * vatRate) / 100;
    const total = afterDiscount + vatAmount;

    return {
      subtotal,
      discountAmount,
      vatAmount,
      total
    };
  };

  const handlePaymentComplete = async (payment: PaymentData) => {
    setPaymentData(payment);
    setShowPaymentDialog(false);
    
    try {
      const totals = calculateTotals();
      const saleId = crypto.randomUUID();
      
      const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
      
      const saleData = {
        id: saleId,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total
        })),
        total_amount: totals.total,
        payment_method: payment.method,
        customer_id: selectedCustomer || undefined,
        discount_id: selectedDiscount || undefined,
        discount_amount: totals.discountAmount,
        tax_amount: totals.vatAmount,
        created_at: new Date().toISOString(),
        payment_details: {
          method: payment.method,
          provider: payment.provider,
          phone: payment.phoneNumber,
          account: payment.accountNumber,
          transactionId: payment.transactionId
        }
      };

      if (navigator.onLine) {
        if (!userProfile?.id) {
          throw new Error('User not authenticated');
        }

        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: saleData.total_amount,
            payment_method: saleData.payment_method,
            customer_id: saleData.customer_id,
            discount_amount: saleData.discount_amount,
            owner_id: userProfile.id
          })
          .select()
          .single();

        if (saleError) throw saleError;

        const saleItems = saleData.items.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('sales_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // Stock is now handled automatically by the database trigger after inserting sale_items
        console.log('Stock will be updated automatically by database trigger');

        // Prepare digital receipt data
        setCurrentReceiptData({
          transactionId: sale.id,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          })),
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          paymentData: payment,
          businessName: businessSettings?.business_name || 'Kiduka Store',
          customerName: selectedCustomerData?.name
        });
      } else {
        offlineStorage.saveSale(saleData);
        cart.forEach(item => {
          offlineStorage.updateProductStock(item.id, item.stock_quantity - item.quantity);
        });

        setCurrentReceiptData({
          transactionId: saleId,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          })),
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          paymentData: payment,
          businessName: businessSettings?.business_name || 'Kiduka Store',
          customerName: selectedCustomerData?.name
        });
      }

      setShowDigitalReceipt(true);

      toast({
        title: 'Muuzo Umekamilika',
        description: `Muuzo wa TZS ${totals.total.toLocaleString()} umekamilika${!navigator.onLine ? ' (imehifadhiwa offline)' : ''}`,
      });

    } catch (error) {
      console.error('Error completing sale:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kukamilisha muuzo',
        variant: 'destructive'
      });
    }
  };

  const resetSale = () => {
    setCart([]);
    setSelectedCustomer('');
    setSelectedDiscount('');
    setPaymentData(null);
    setShowReceipt(false);
    setShowDigitalReceipt(false);
    setCurrentReceiptData(null);
  };

  const totals = calculateTotals();
  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Point of Sale</h2>
        {!navigator.onLine && (
          <Badge variant="destructive">Offline Mode</Badge>
        )}
      </div>

      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Add Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowScanner(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode manually"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addProductToCart(manualBarcode.trim())}
            />
            <Button onClick={() => addProductToCart(manualBarcode.trim())} disabled={!manualBarcode.trim()}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer and Discount Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <User className="h-4 w-4 mr-2" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No customer</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Percent className="h-4 w-4 mr-2" />
              Discount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
              <SelectTrigger>
                <SelectValue placeholder="Select discount (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No discount</SelectItem>
                {discounts.map(discount => (
                  <SelectItem key={discount.id} value={discount.id}>
                    {discount.code} ({discount.type === 'percentage' ? `${discount.value}%` : `TZS ${discount.value}`} off)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Shopping Cart ({cart.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty. Scan products to add them.</p>
          ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">
                    TZS {item.price.toLocaleString()} per {item.is_weight_based ? (item.unit_type || 'unit') : 'piece'}
                  </p>
                  {item.is_weight_based && (
                    <p className="text-xs text-blue-600">Weight-based product</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCartItemQuantity(item.id, item.quantity - (item.is_weight_based ? 0.1 : 1))}
                    disabled={item.quantity <= (item.is_weight_based ? (item.min_quantity || 0.1) : 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                   <span className="w-16 text-center text-sm">
                     {item.is_weight_based 
                       ? `${parseFloat(item.quantity.toString()).toLocaleString()} ${item.unit_type || 'unit'}`
                       : Math.floor(item.quantity).toString()
                     }
                   </span>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCartItemQuantity(item.id, item.quantity + (item.is_weight_based ? 0.1 : 1))}
                    disabled={!item.is_weight_based && item.quantity >= item.stock_quantity}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  
                  <span className="w-20 text-right font-medium">TZS {item.total.toLocaleString()}</span>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Totals and Checkout */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>TZS {totals.subtotal.toLocaleString()}</span>
            </div>
            
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-TZS {totals.discountAmount.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>VAT ({vatRate}%):</span>
              <span>TZS {totals.vatAmount.toLocaleString()}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>TZS {totals.total.toLocaleString()}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowPaymentDialog(true)}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
            >
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Digital Receipt Modal */}
      {showDigitalReceipt && currentReceiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Muuzo Umekamilika!</h3>
            <DigitalReceiptService
              receiptData={currentReceiptData}
              onClose={() => {
                setShowDigitalReceipt(false);
                resetSale();
              }}
            />
          </div>
        </div>
      )}

      {/* Traditional Receipt Display (for backup) */}
      {showReceipt && paymentData && !showDigitalReceipt && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedReceiptPrinter
            items={cart}
            subtotal={totals.subtotal}
            vatAmount={totals.vatAmount}
            total={totals.total}
            transactionId={paymentData.transactionId || ''}
            paymentData={paymentData}
            customerName={selectedCustomerData?.name}
            businessName={businessSettings?.business_name || 'Kiduka Store'}
            vatNumber={businessSettings?.vat_number}
            onPrint={() => {
              toast({
                title: 'Risiti Imechapishwa',
                description: 'Risiti imetumwa kwa kichapishi'
              });
            }}
          />
          <div className="space-y-4">
            <Button onClick={resetSale} className="w-full">
              Muuzo Mpya
            </Button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner />
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Point your camera at a barcode to scan</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setShowScanner(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Quantity Selector Modal */}
      {showWeightSelector && selectedProductForWeight && (
        <WeightQuantitySelector
          product={selectedProductForWeight}
          onClose={() => {
            setShowWeightSelector(false);
            setSelectedProductForWeight(null);
          }}
          onAddToCart={handleWeightProductAdd}
        />
      )}

      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={totals.total}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};
