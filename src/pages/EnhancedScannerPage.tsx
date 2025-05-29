
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Plus, Minus, ShoppingCart, Trash2, User, Percent, Calculator } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
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
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  loyalty_points: number;
}

interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
}

export const EnhancedScannerPage = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedDiscount, setSelectedDiscount] = useState<string>('');
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, loyalty_points')
        .order('name');

      // Fetch discounts
      const { data: discountsData } = await supabase
        .from('discounts')
        .select('*')
        .eq('active', true);

      // Fetch tax rate from settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('tax_rate')
        .eq('owner_id', userProfile?.id)
        .single();

      setCustomers(customersData || []);
      setDiscounts(discountsData || []);
      setTaxRate(settingsData?.tax_rate || 0);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    await addProductToCart(barcode);
    setShowScanner(false);
  };

  const handleManualBarcodeSubmit = async () => {
    if (manualBarcode.trim()) {
      await addProductToCart(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const addProductToCart = async (barcode: string) => {
    setLoading(true);
    try {
      let product: Product | null = null;

      // Try to find product online first
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, stock_quantity, barcode, cost_price')
          .eq('barcode', barcode)
          .eq('owner_id', userProfile?.id)
          .single();

        if (!error && data) {
          product = data;
        }
      } else {
        // Fallback to offline products
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

      if (product.stock_quantity <= 0) {
        toast({
          title: 'Out of stock',
          description: `${product.name} is out of stock`,
          variant: 'destructive'
        });
        return;
      }

      // Check if product already in cart
      const existingItem = cart.find(item => item.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          toast({
            title: 'Insufficient stock',
            description: `Only ${product.stock_quantity} items available`,
            variant: 'destructive'
          });
          return;
        }
        updateCartItemQuantity(product.id, existingItem.quantity + 1);
      } else {
        const cartItem: CartItem = {
          ...product,
          quantity: 1,
          total: product.price
        };
        setCart([...cart, cartItem]);
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

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        const maxQuantity = item.stock_quantity;
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
    const taxAmount = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Empty cart',
        description: 'Add products to cart before completing sale',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const totals = calculateTotals();
      const saleId = crypto.randomUUID();
      const saleData = {
        id: saleId,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total
        })),
        total_amount: totals.total,
        payment_method: 'cash',
        customer_id: selectedCustomer || undefined,
        discount_id: selectedDiscount || undefined,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        created_at: new Date().toISOString()
      };

      if (navigator.onLine) {
        // Process sale online
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: saleData.total_amount,
            payment_method: saleData.payment_method,
            customer_id: saleData.customer_id,
            discount_id: saleData.discount_id,
            discount_amount: saleData.discount_amount,
            tax_amount: saleData.tax_amount,
            owner_id: userProfile?.id,
            created_at: saleData.created_at
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Add sale items
        const saleItems = saleData.items.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;
      } else {
        // Save sale offline
        offlineStorage.saveSale(saleData);
        
        // Update offline product stock
        cart.forEach(item => {
          offlineStorage.updateProductStock(item.id, item.stock_quantity - item.quantity);
        });
      }

      // Update customer loyalty points
      if (selectedCustomer && navigator.onLine) {
        const pointsEarned = Math.floor(totals.total / 10);
        await supabase
          .from('customers')
          .update({
            loyalty_points: customers.find(c => c.id === selectedCustomer)?.loyalty_points + pointsEarned
          })
          .eq('id', selectedCustomer);
      }

      toast({
        title: 'Sale completed',
        description: `Sale of $${totals.total.toFixed(2)} completed successfully${!navigator.onLine ? ' (saved offline)' : ''}`
      });

      // Reset cart
      setCart([]);
      setSelectedCustomer('');
      setSelectedDiscount('');
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

  const totals = calculateTotals();

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
              onKeyPress={(e) => e.key === 'Enter' && handleManualBarcodeSubmit()}
            />
            <Button onClick={handleManualBarcodeSubmit} disabled={!manualBarcode.trim()}>
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
                    {customer.name} ({customer.loyalty_points} pts)
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
                    {discount.code} ({discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`} off)
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
                    <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-8 text-center">{item.quantity}</span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-16 text-right font-medium">${item.total.toFixed(2)}</span>
                    
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
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-${totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Tax ({taxRate}%):</span>
                <span>${totals.taxAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              onClick={completeSale} 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
