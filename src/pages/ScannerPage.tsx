import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Plus, Minus, ShoppingCart, Edit2, Trash2, X, RotateCcw, Check, History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

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
  const [scanHistory, setScanHistory] = useState<Product[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showReview, setShowReview] = useState(false);

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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const skipNextSearchRef = useRef(false);

  // Handle product passed from ProductsPage "Uza" button
  useEffect(() => {
    const incoming = (location.state as any)?.selectedProduct;
    if (incoming) {
      setScannedProduct(incoming);
      setSearchResults([]);
      setSearchQuery('');
      // clear router state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => {
      handleSearchProduct(searchQuery);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchType]);
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
    skipNextSearchRef.current = true;
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
        id: sale.id,
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
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

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

      {/* Camera / Scan Viewport (top half) */}
      <div className="relative flex-1 min-h-0 bg-neutral-900 overflow-hidden">
        {/* Simulated camera / product surface */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)]" />

        {/* Green corner brackets */}
        <div className="absolute inset-8 pointer-events-none">
          <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
          <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
        </div>

        {/* Floating quick actions on right */}
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-10 w-10 bg-white/90 hover:bg-white text-neutral-900 shadow-lg"
            onClick={() => setShowCamera(true)}
            title="Fungua Kamera"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-10 w-10 bg-white/90 hover:bg-white text-neutral-900 shadow-lg"
            onClick={() => setSearchType(searchType === 'barcode' ? 'name' : 'barcode')}
            title="Badili aina ya utafutaji"
          >
            <Edit2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Search input floating at top */}
        <div className="absolute top-4 left-4 right-20">
          <Input
            placeholder={searchType === 'barcode' ? 'Ingiza barcode…' : 'Andika jina la bidhaa…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-full bg-white/95 border-0 shadow-lg text-sm"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="w-full text-left p-3 hover:bg-neutral-50 flex justify-between items-center"
                >
                  <span className="text-sm text-neutral-900">{p.name}</span>
                  <span className="text-sm font-semibold text-primary">TZS {p.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected product quick-add pill */}
        {scannedProduct && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-white/95 rounded-full pl-4 pr-1 py-1 shadow-lg">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{scannedProduct.name}</p>
              <p className="text-xs text-neutral-500">TZS {scannedProduct.price.toLocaleString()}</p>
            </div>
            <Button
              size="sm"
              className="rounded-full h-9 px-4"
              onClick={() => addToCart(scannedProduct)}
              disabled={scannedProduct.stock_quantity <= 0}
            >
              <Plus className="h-4 w-4 mr-1" /> Ongeza
            </Button>
          </div>
        )}
      </div>

      {/* Bottom sheet: Scanned Items */}
      <div className="relative bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55%]">
        {/* Grabber */}
        <div className="pt-2 pb-1 flex justify-center">
          <span className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {/* Header with total */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Scanned Items</h3>
            <p className="text-xs text-neutral-500">{cart.length} bidhaa</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Total Price</p>
            <p className="text-lg font-bold text-neutral-900">TZS {getSubtotal().toLocaleString()}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 divide-y divide-neutral-100">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-8">Kikapu ni tupu — anza kuscan bidhaa</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">TZS {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full border border-neutral-200"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold text-neutral-900">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full border border-neutral-200"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Review Order button */}
        <div className="px-5 pb-5 pt-2 border-t border-neutral-100">
          <Button
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-md"
            disabled={cart.length === 0}
            onClick={() => setShowPayment(true)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Review Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
