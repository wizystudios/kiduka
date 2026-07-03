import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Search, Plus, Minus, ShoppingCart, Edit2, Trash2, X, RotateCcw, Check, History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { PaymentMethodDialog } from '@/components/PaymentMethodDialog';
import { EnhancedReceiptPrinter } from '@/components/EnhancedReceiptPrinter';
import { WeightSelector } from '@/components/WeightSelector';
import { DigitalReceiptService } from '@/components/DigitalReceiptService';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
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
  
  const [showWeightSelector, setShowWeightSelector] = useState(false);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [scanHistory, setScanHistory] = useState<Product[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const scanProcessingRef = useRef(false);

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
      handleSearchProduct(searchQuery, { source: 'manual' });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchType]);

  // Auto-start live camera scanner (continuous decode)
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, 250);
    readerRef.current = reader;
    setCameraError(null);
    (async () => {
      try {
        if (!videoRef.current) return;
        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
          if (cancelled) return;
          if (result) {
            const code = result.getText();
            const now = Date.now();
            if (scanProcessingRef.current) return;
            // Continuous camera should not keep adding the same item while it stays in frame.
            if (code === lastScanRef.current.code && now - lastScanRef.current.at < 4500) return;
            lastScanRef.current = { code, at: now };
            scanProcessingRef.current = true;
            skipNextSearchRef.current = true;
            setSearchType('barcode');
            setSearchQuery(code);
            handleSearchProduct(code, { source: 'camera', autoAddBarcode: true }).finally(() => {
              window.setTimeout(() => { scanProcessingRef.current = false; }, 650);
            });
          }
        });
      } catch (e: any) {
        console.error('Camera error:', e);
        if (!cancelled) setCameraError(e?.message || 'Imeshindwa kufungua kamera. Ruhusu ufikiaji wa kamera.');
      }
    })();
    return () => {
      cancelled = true;
      try { reader.reset(); } catch {}
      readerRef.current = null;
    };
  }, [cameraOn]);
  const handleSearchProduct = async (
    query: string,
    options: { source?: 'camera' | 'manual'; autoAddBarcode?: boolean } = {}
  ) => {
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
      const trimmed = query.trim();
      const { data: barcodeMatches, error: barcodeError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', trimmed)
        .eq('owner_id', dataOwnerId)
        .limit(1);

      if (barcodeError) throw barcodeError;

      if (barcodeMatches && barcodeMatches.length > 0) {
        const product = barcodeMatches[0] as Product;
        setScannedProduct(product);
        setSearchResults([]);
        if (options.autoAddBarcode) {
          addToCart(product);
        } else {
          toast({
            title: 'Bidhaa Imepatikana!',
            description: `${product.name} - TZS ${product.price.toLocaleString()}`
          });
        }
        return;
      }

      const { data: nameMatches, error: nameError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .eq('owner_id', dataOwnerId)
        .limit(10);

      if (nameError) throw nameError;

      console.log('Search results:', nameMatches);
      const results = (nameMatches || []) as Product[];
      const exactName = results.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());

      if (exactName && results.length === 1) {
        setScannedProduct(exactName);
        setSearchResults([]);
        return;
      }

      setSearchResults(results);
      setScannedProduct(null);
      if (options.source === 'camera') {
        toast({
          title: 'Bidhaa Haipatikani',
          description: 'Barcode/QR hii haipo kwenye bidhaa zako',
          variant: 'destructive'
        });
      } else if (trimmed.length >= 3 && results.length === 0) {
        // Manual search should stay quiet while the user is still typing.
        setSearchResults([]);
      } else {
        setSearchResults(results);
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
    handleSearchProduct(barcode, { source: 'camera', autoAddBarcode: true });
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
    setScanHistory(prev => [product, ...prev.filter(p => p.id !== product.id)].slice(0, 30));
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

  const setQuantity = (id: string, qty: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const clamped = Math.max(1, Math.min(item.stock_quantity || qty, qty));
        return { ...item, quantity: clamped };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const rescanItem = (item: CartItem) => {
    removeFromCart(item.id);
    setSearchType('barcode');
    setCameraOn(true);
    searchInputRef.current?.blur();
  };

  const clearHistory = () => {
    setScanHistory([]);
    setCart([]);
    setScannedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    toast({ title: 'Historia imefutwa', description: 'Anza kuscan upya' });
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
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">


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

      {/* Camera / Scan Viewport — LIVE camera, auto-scans immediately */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {/* Subtle scrim so overlays remain readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white bg-black/70 z-10">
            <CameraOff className="h-10 w-10 mb-3 opacity-80" />
            <p className="text-sm mb-3">{cameraError}</p>
            <Button size="sm" className="rounded-full" onClick={() => { setCameraOn(false); setTimeout(() => setCameraOn(true), 50); }}>
              Jaribu tena
            </Button>
          </div>
        )}

        {/* Green corner brackets */}
        <div className="absolute inset-8 pointer-events-none">
          <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
          <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
        </div>

        {/* Floating focus action only; camera starts by itself */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-20 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-9 w-9 bg-white/80 backdrop-blur hover:bg-white text-neutral-900 shadow pointer-events-auto"
            onClick={() => searchInputRef.current?.focus()}
            title="Andika barcode au jina"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Full-width search input stays low, away from the scan window */}
        <div className="absolute left-3 right-3 bottom-4 z-20 pointer-events-none">
          {searchResults.length > 0 && (
            <div className="mb-2 bg-white rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y pointer-events-auto">
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
          <div className="relative pointer-events-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              ref={searchInputRef}
              placeholder="Scan au andika barcode / jina la bidhaa…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-full bg-white/95 border-0 shadow-lg text-sm text-neutral-900 placeholder:text-neutral-500 pl-11 pr-11"
            />
            {loading ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
            ) : searchQuery ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-neutral-500 hover:bg-neutral-100"
                onClick={() => { setSearchQuery(''); setSearchResults([]); setScannedProduct(null); }}
                aria-label="Futa utafutaji"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Selected product quick-add pill */}
        {scannedProduct && (
          <div className="absolute bottom-20 left-4 right-4 flex items-center justify-between bg-white/95 rounded-full pl-4 pr-1 py-1 shadow-lg z-20">
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
        <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-neutral-900">Scanned Items</h3>
            <p className="text-xs text-neutral-500">{cart.length} bidhaa</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs text-neutral-600"
              onClick={() => setShowHistory(true)}
              title="Historia ya scan"
            >
              <History className="h-4 w-4 mr-1" />
              {scanHistory.length}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs text-red-600 hover:bg-red-50"
              onClick={clearHistory}
              disabled={scanHistory.length === 0 && cart.length === 0}
              title="Futa vyote"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Futa
            </Button>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Total</p>
            <p className="text-lg font-bold text-neutral-900">TZS {getSubtotal().toLocaleString()}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 divide-y divide-neutral-100">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-8">Kikapu ni tupu — anza kuscan bidhaa</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">TZS {item.price.toLocaleString()} · Jumla TZS {(item.price * item.quantity).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-neutral-200"
                    onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="h-8 w-12 text-center text-sm rounded-full px-1"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-neutral-200"
                    onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-blue-600"
                    onClick={() => rescanItem(item)} title="Scan upya">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-600"
                    onClick={() => removeFromCart(item.id)} title="Ondoa">
                    <X className="h-4 w-4" />
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
            onClick={() => setShowReview(true)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Review Order
          </Button>
        </div>
      </div>

      {/* Scan History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><History className="h-5 w-5" /> Historia ya Scan</span>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setScanHistory([])} disabled={scanHistory.length === 0}>
                <Trash2 className="h-4 w-4 mr-1" /> Futa
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4 divide-y">
            {scanHistory.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-8">Bado hakuna scan yoyote</p>
            ) : scanHistory.map(p => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-neutral-500 font-mono">{p.barcode} · TZS {p.price.toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => addToCart(p)}>
                  <Plus className="h-4 w-4 mr-1" /> Ongeza
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Review Order Sheet */}
      <Sheet open={showReview} onOpenChange={setShowReview}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Review Order</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4 divide-y">
            {cart.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">TZS {item.price.toLocaleString()} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full border" onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full border" onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <p className="w-20 text-right text-sm font-semibold">TZS {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Jumla</span>
              <span className="text-xl font-bold">TZS {getSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => setShowReview(false)}>
                Rekebisha
              </Button>
              <Button
                className="flex-1 rounded-2xl h-11 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setShowReview(false); setShowPayment(true); }}
                disabled={cart.length === 0}
              >
                <Check className="h-4 w-4 mr-1" /> Thibitisha na Lipa
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default ScannerPage;
