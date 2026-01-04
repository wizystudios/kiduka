import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
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
  const { dataOwnerId, ownerBusinessName, loading: dataLoading } = useDataAccess();

  const handleSearchProduct = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    if (!dataOwnerId) {
      toast({
        title: 'Error',
        description: 'Hakuna data ya biashara. Jaribu tena.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Searching for products with dataOwnerId:', dataOwnerId);
      let searchQuery;
      
      if (searchType === 'barcode') {
        searchQuery = supabase
          .from('products')
          .select('*')
          .eq('barcode', query.trim())
          .eq('owner_id', dataOwnerId);
      } else {
        searchQuery = supabase
          .from('products')
          .select('*')
          .ilike('name', `%${query.trim()}%`)
          .eq('owner_id', dataOwnerId)
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
            title: 'Bidhaa Imepatikana!',
            description: `${data[0].name} - TZS ${data[0].price.toLocaleString()}`
          });
        } else {
          toast({
            title: 'Bidhaa Haipatikani',
            description: 'Hakuna bidhaa yenye barcode hii',
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
            title: 'Bidhaa Zimepatikana',
            description: `${data.length} bidhaa zimepatikana`
          });
        } else {
          toast({
            title: 'Hakuna Bidhaa',
            description: 'Hakuna bidhaa zinazofanana na utafutaji',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      console.error('Error searching product:', error);
      const errorMessage = error?.message || 'Hitilafu ya kutafuta. Jaribu tena.';
      toast({
        title: 'Hitilafu',
        description: errorMessage,
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
    if (product.is_weight_based) {
      setSelectedProductForWeight(product);
      setShowWeightSelector(true);
      return;
    }

    if (product.stock_quantity <= 0) {
      toast({
        title: 'Hakuna Stock',
        description: 'Bidhaa hii haina stock',
        variant: 'destructive'
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({
          title: 'Stock Haitoshi',
          description: 'Haiwezekani kuongeza zaidi ya stock iliyopo',
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
      title: 'Imeongezwa',
      description: `${product.name} imeongezwa kwenye kikapu`
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
      title: 'Imeongezwa',
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

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    if (cart.length === 0 || !dataOwnerId) return;

    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: dataOwnerId,
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

      // Update product stock quantities
      try {
        const updates = cart.map(async (item) => {
          const { data: latest, error: fetchErr } = await supabase
            .from('products')
            .select('stock_quantity, is_weight_based')
            .eq('id', item.id)
            .eq('owner_id', dataOwnerId)
            .single();
          if (fetchErr) throw fetchErr;

          const currentQty = Number(latest?.stock_quantity ?? item.stock_quantity);
          const isWeight = latest?.is_weight_based ?? item.is_weight_based;
          const deduction = item.quantity as number;
          const newQty = Math.max(0, isWeight ? Math.floor(currentQty - deduction) : currentQty - deduction);

          const { error: updateErr } = await supabase
            .from('products')
            .update({ stock_quantity: newQty })
            .eq('id', item.id)
            .eq('owner_id', dataOwnerId);
          if (updateErr) throw updateErr;
        });
        await Promise.all(updates);
      } catch (e) {
        console.error('Error updating product stock after sale:', e);
      }

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
        businessName: ownerBusinessName || userProfile?.business_name || 'KIDUKA STORE'
      });

      toast({
        title: 'Mauzo Yamekamilika!',
        description: `Jumla: TZS ${getSubtotal().toLocaleString()}`
      });
      
      setShowPayment(false);
      setShowReceipt(true);
      setCart([]);
      setScannedProduct(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error completing sale:', error);
      toast({
        title: 'Hitilafu ya Mauzo',
        description: error?.message || 'Kosa la kutarajwa. Jaribu tena.',
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

  if (dataLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 rounded mb-2">
        <h2 className="text-sm font-bold text-foreground mb-1">💰 Muuzo wa Haraka</h2>
        <p className="text-xs text-muted-foreground">Tafuta bidhaa</p>
        <div className="mt-1 p-1.5 bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500 rounded">
          <p className="text-xs text-green-800 dark:text-green-200">
            💡 Tumia jina kwa haraka!
          </p>
        </div>
      </div>

      <CameraScanner
        isOpen={showCamera}
        onScan={handleCameraScan}
        onClose={() => setShowCamera(false)}
      />

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

      <PaymentMethodDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        totalAmount={getSubtotal()} 
        onPaymentComplete={handlePaymentComplete}
      />

      {showReceipt && completedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-center text-foreground">Mauzo Yamekamilika!</h3>
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
              Endelea
            </Button>
          </div>
        </div>
      )}

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
        <div className="space-y-4">
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-foreground">
                <Search className="h-6 w-6 mr-2" />
                Tafuta Bidhaa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  variant={searchType === "name" ? "default" : "outline"}
                  onClick={() => setSearchType("name")}
                  className="flex-1 h-12 text-base"
                >
                  📝 Jina
                </Button>
                <Button
                  variant={searchType === "barcode" ? "default" : "outline"}
                  onClick={() => setSearchType("barcode")}
                  className="flex-1 h-12 text-base"
                >
                  📷 Barcode
                </Button>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder={searchType === 'barcode' ? "Ingiza nambari ya barcode..." : "Andika jina la bidhaa..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchProduct(searchQuery)}
                  className="h-14 text-lg"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSearchProduct(searchQuery)}
                    className="flex-1 h-14 text-base"
                    disabled={!searchQuery || loading}
                  >
                    <Search className="h-5 w-5 mr-2" />
                    {loading ? 'Inatafuta...' : 'Tafuta'}
                  </Button>
                  {searchType === 'barcode' && (
                    <Button 
                      onClick={() => setShowCamera(true)}
                      variant="outline"
                      className="h-14 px-6"
                    >
                      <Camera className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-sm text-foreground">Matokeo ({searchResults.length})</h4>
                  {searchResults.map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-border"
                      onClick={() => selectProduct(product)}
                    >
                      <CardContent className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">TZS {product.price.toLocaleString()}</p>
                          <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                            Stock: {product.stock_quantity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {scannedProduct && (
                <Card className="border-2 border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{scannedProduct.name}</h3>
                        <p className="text-sm text-muted-foreground">{scannedProduct.category}</p>
                        {scannedProduct.barcode && (
                          <p className="text-xs text-muted-foreground">Barcode: {scannedProduct.barcode}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          TZS {scannedProduct.price.toLocaleString()}
                        </p>
                        <Badge variant={scannedProduct.stock_quantity > 0 ? "default" : "destructive"}>
                          Stock: {scannedProduct.stock_quantity}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12"
                      onClick={() => addToCart(scannedProduct)}
                      disabled={scannedProduct.stock_quantity <= 0}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Ongeza kwenye Kikapu
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Kikapu ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Kikapu ni tupu</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{item.name}</p>
                        <p className="text-sm text-primary">
                          TZS {item.price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium text-foreground">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="w-24 text-right font-bold text-foreground">
                        TZS {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span className="text-foreground">Jumla:</span>
                      <span className="text-primary">TZS {getSubtotal().toLocaleString()}</span>
                    </div>
                    <Button 
                      className="w-full mt-4 h-14 text-lg"
                      onClick={() => setShowPayment(true)}
                    >
                      Lipa Sasa
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;