import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Search, ShoppingCart, Store, Package, Star, 
  ChevronRight, Sparkles, TrendingUp, Clock, Heart,
  Camera, ArrowLeft, Plus, Minus, Trash2, Phone,
  ClipboardList, Truck, Eye, Grid3X3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MobileMoneyPayment } from './MobileMoneyPayment';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
import { OrderReceiptDialog } from './OrderReceiptDialog';
import { SokoniProductDetail } from './SokoniProductDetail';
import { useWishlist } from '@/hooks/useWishlist';
import { SokoniBottomNav } from './SokoniBottomNav';

interface MarketProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  stock_quantity: number;
  image_url: string | null;
  owner_id: string;
  owner_business_name?: string;
  owner_phone?: string;
  created_at?: string;
}

interface CartItem extends MarketProduct {
  quantity: number;
}

interface SellerProfile {
  id: string;
  business_name: string | null;
  phone: string | null;
}

interface GuestOrder {
  tracking_code: string;
  customer_phone: string;
  order_date: string;
  total_amount: number;
  items: { product_name: string; quantity: number; unit_price: number }[];
}

interface CategoryItem {
  name: string;
  icon: string;
  count: number;
}

// Local storage keys
const GUEST_CART_KEY = 'sokoni_guest_cart';
const GUEST_ORDERS_KEY = 'sokoni_guest_orders';

// Helper functions for localStorage
const getGuestCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setGuestCart = (cart: CartItem[]) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
};

const getGuestOrders = (): GuestOrder[] => {
  try {
    const stored = localStorage.getItem(GUEST_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveGuestOrder = (order: GuestOrder) => {
  try {
    const orders = getGuestOrders();
    orders.unshift(order);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch (e) {
    console.error('Failed to save order:', e);
  }
};

const getCategoryIcon = (cat: string) => {
  const icons: Record<string, string> = {
    'Electronics': '📱', 'Elektroniki': '📱',
    'Fashion': '👗', 'Mavazi': '👗',
    'Food': '🍔', 'Chakula': '🍔',
    'Home': '🏠', 'Nyumba': '🏠',
    'Sports': '⚽', 'Michezo': '⚽',
    'Beauty': '💄', 'Urembo': '💄',
    'Books': '📚', 'Vitabu': '📚',
    'Toys': '🧸', 'Vifaa': '🧸',
  };
  return icons[cat] || '📦';
};

export const SokoniMarketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { wishlistCount, addToWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => getGuestCart());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTiming, setPaymentTiming] = useState<'now' | 'on_delivery'>('now');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [guestOrders, setGuestOrders] = useState<GuestOrder[]>(() => getGuestOrders());
  const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  
  // Receipt dialog state
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    trackingCodes: string[];
    customerPhone: string;
    deliveryAddress: string;
    items: { product_name: string; quantity: number; unit_price: number }[];
    totalAmount: number;
    paymentMethod: string;
  } | null>(null);

  const generateTrackingCode = () => {
    const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `SKN-${rand}`;
  };

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    setGuestCart(cart);
  }, [cart]);

  // Check if a specific product is requested
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setProductDetailOpen(true);
      }
    }
  }, [searchParams, products]);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        setIsSeller((count || 0) > 0);
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, description, category, stock_quantity, image_url, owner_id, created_at')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const sellerIds = [...new Set(productsData?.map(p => p.owner_id) || [])];

      let profilesData: SellerProfile[] = [];
      if (sellerIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, business_name, phone')
          .in('id', sellerIds);

        if (!error && data) profilesData = data as any;
      }

      setSellers(profilesData);

      const enrichedProducts = (productsData || []).map(product => {
        const seller = profilesData?.find(p => p.id === product.owner_id);
        return {
          ...product,
          owner_business_name: seller?.business_name || 'Duka',
          owner_phone: seller?.phone || undefined
        };
      });

      setProducts(enrichedProducts);

      // Build categories
      const catMap: Record<string, number> = {};
      enrichedProducts.forEach(p => {
        const cat = p.category || 'Nyingine';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      setCategories(Object.entries(catMap).map(([name, count]) => ({
        name,
        icon: getCategoryIcon(name),
        count
      })).slice(0, 8));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast.error('Imeshindwa kupakia bidhaa za sokoni');
      setLoading(false);
    }
  };

  const addToCart = (product: MarketProduct, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    toast.success(`${product.name} imeongezwa kwenye kikapu`);
  };

  const openProductDetail = (product: MarketProduct) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  };

  const getRelatedProducts = (product: MarketProduct) => {
    return products
      .filter(p => p.owner_id === product.owner_id && p.id !== product.id)
      .slice(0, 6);
  };

  const updateCartQuantity = (productId: string, change: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + change;
          if (newQty <= 0) return null as any;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.owner_business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get top deals (lowest prices)
  const topDeals = [...products].sort((a, b) => a.price - b.price).slice(0, 6);

  // Get new arrivals
  const newArrivals = products.slice(0, 6);

  // Get top ranking
  const topRanking = [...products].sort(() => Math.random() - 0.5).slice(0, 4);

  // Group products by seller for "Maduka" tab
  const productsBySeller = products.reduce((acc, product) => {
    const sellerId = product.owner_id;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller: sellers.find(s => s.id === sellerId) || { id: sellerId, business_name: 'Duka', phone: null },
        products: []
      };
    }
    acc[sellerId].products.push(product);
    return acc;
  }, {} as Record<string, { seller: SellerProfile; products: MarketProduct[] }>);

  const handlePaymentComplete = async (transactionId: string, method: string) => {
    if (submittingOrder) return;

    const normalizedCustomerPhone = normalizeTzPhoneDigits(customerPhone);
    if (!normalizedCustomerPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setSubmittingOrder(true);

    try {
      const sellerGroups = cart.reduce((acc, item) => {
        const sellerId = item.owner_id;
        if (!acc[sellerId]) acc[sellerId] = [];
        acc[sellerId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      const trackingCodes: string[] = [];
      const allOrderItems: { product_name: string; quantity: number; unit_price: number }[] = [];

      for (const [sellerId, items] of Object.entries(sellerGroups)) {
        const orderItems = items.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price
        }));
        
        allOrderItems.push(...orderItems.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price
        })));

        const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const trackingCode = generateTrackingCode();
        trackingCodes.push(trackingCode);

        const paymentStatus = method === 'cash_on_delivery' ? 'pending' : 'paid';

        const { error: orderError } = await supabase
          .from('sokoni_orders')
          .insert({
            seller_id: sellerId,
            customer_phone: normalizedCustomerPhone,
            delivery_address: deliveryAddress,
            items: orderItems,
            total_amount: orderTotal,
            payment_method: method,
            payment_status: paymentStatus,
            order_status: 'new',
            transaction_id: transactionId,
            tracking_code: trackingCode,
          });

        if (orderError) throw orderError;
      }

      saveGuestOrder({
        tracking_code: trackingCodes.join(', '),
        customer_phone: normalizedCustomerPhone,
        order_date: new Date().toISOString(),
        total_amount: cartTotal,
        items: allOrderItems
      });
      setGuestOrders(getGuestOrders());

      setReceiptData({
        trackingCodes,
        customerPhone: normalizedCustomerPhone,
        deliveryAddress,
        items: allOrderItems,
        totalAmount: cartTotal,
        paymentMethod: method
      });
      setReceiptOpen(true);

      setCart([]);
      setCustomerPhone('');
      setDeliveryAddress('');
      setPaymentOpen(false);
      setCheckoutOpen(false);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Imeshindwa kutuma oda. Jaribu tena.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const toggleWishlist = (product: MarketProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.success('Imeondolewa kwenye vipendwa');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        owner_business_name: product.owner_business_name
      });
      toast.success('Imeongezwa kwenye vipendwa');
    }
  };

  // Product Card component
  const ProductCard = ({ product, showDiscount = false }: { product: MarketProduct; showDiscount?: boolean }) => (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 bg-card"
      onClick={() => openProductDetail(product)}
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {product.category && (
          <Badge className="absolute top-2 left-2 text-xs bg-background/90 text-foreground">
            {product.category}
          </Badge>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`absolute top-2 right-2 h-8 w-8 ${isInWishlist(product.id) ? 'bg-destructive/90 text-white hover:bg-destructive' : 'bg-background/80 hover:bg-background'}`}
          onClick={(e) => toggleWishlist(product, e)}
        >
          <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
        </Button>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 min-h-[40px]">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <Store className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">{product.owner_business_name}</span>
        </div>
        <div className="mt-2">
          {showDiscount && (
            <span className="text-xs text-muted-foreground line-through mr-2">
              TSh {(product.price * 1.15).toLocaleString()}
            </span>
          )}
          <span className={`font-bold ${showDiscount ? 'text-destructive' : 'text-primary'}`}>
            TSh {product.price.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          {showDiscount && (
            <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive">
              -15% OFF
            </Badge>
          )}
          <Badge variant="outline" className="text-xs ml-auto">
            {product.stock_quantity} pcs
          </Badge>
        </div>
        <Button 
          size="sm" 
          className="w-full mt-2 group-hover:bg-primary/90"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product, 1);
          }}
        >
          <ShoppingCart className="h-3 w-3 mr-1" />
          Ongeza
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Inapakia Sokoni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="flex items-center gap-2 p-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/70" />
            <Input
              placeholder="Tafuta bidhaa, duka..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (activeTab === 'home') setActiveTab('browse');
              }}
              className="pl-10 pr-10 bg-primary-foreground/20 border-0 text-primary-foreground placeholder:text-primary-foreground/70 h-10 rounded-full"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary-foreground"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          
          {isSeller && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/sokoni-orders')}
            >
              <Truck className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Categories */}
        <div className="overflow-x-auto border-t border-primary-foreground/20">
          <div className="flex gap-2 p-2 min-w-max">
            <Button 
              variant={!selectedCategory ? 'secondary' : 'ghost'}
              size="sm" 
              className={`rounded-full flex items-center gap-1 text-xs ${!selectedCategory ? '' : 'text-primary-foreground hover:bg-primary-foreground/10'}`}
              onClick={() => {
                setSelectedCategory(null);
                setActiveTab('browse');
              }}
            >
              <Grid3X3 className="h-3 w-3" />
              Zote
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.name}
                variant={selectedCategory === cat.name ? 'secondary' : 'ghost'}
                size="sm" 
                className={`rounded-full text-xs ${selectedCategory === cat.name ? '' : 'text-primary-foreground hover:bg-primary-foreground/10'}`}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setActiveTab('browse');
                }}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mx-4 mt-2" style={{ width: 'calc(100% - 32px)' }}>
          <TabsTrigger value="home" className="text-xs">
            <Sparkles className="h-4 w-4 mr-1" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="browse" className="text-xs">
            <Package className="h-4 w-4 mr-1" />
            Bidhaa
          </TabsTrigger>
          <TabsTrigger value="stores" className="text-xs">
            <Store className="h-4 w-4 mr-1" />
            Maduka
          </TabsTrigger>
          <TabsTrigger value="myorders" className="text-xs relative">
            <ClipboardList className="h-4 w-4 mr-1" />
            Oda
            {guestOrders.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {guestOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Home/Deals Tab */}
        <TabsContent value="home" className="p-4 space-y-6">
          {/* Featured Banner */}
          <Card className="overflow-hidden bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-bold">Sokoni Deals</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Punguzo Kubwa!</h2>
                <p className="text-sm opacity-90">Bei nafuu kwa bidhaa bora</p>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setActiveTab('browse')}
                >
                  Tazama Sasa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="hidden md:block">
                <Package className="h-24 w-24 opacity-20" />
              </div>
            </CardContent>
          </Card>

          {/* Top Deals */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                <h2 className="font-bold text-lg">Top Deals</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveTab('browse')}
              >
                Zaidi
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {topDeals.map(product => (
                <ProductCard key={product.id} product={product} showDiscount />
              ))}
            </div>
          </section>

          {/* Top Ranking & New Arrivals */}
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-bold">Top Ranking</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('browse')}>
                  Zaidi <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topRanking.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h2 className="font-bold">Bidhaa Mpya</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('browse')}>
                  Zaidi <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {newArrivals.slice(0, 4).map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="browse" className="px-4 mt-2">
          {selectedCategory && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-sm">
                {getCategoryIcon(selectedCategory)} {selectedCategory}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                Ondoa
              </Button>
            </div>
          )}
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Hakuna bidhaa</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Hakuna matokeo ya utafutaji' : 'Hakuna bidhaa katika kategoria hii'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stores Tab */}
        <TabsContent value="stores" className="px-4 mt-2">
          {Object.keys(productsBySeller).length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Hakuna maduka</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(productsBySeller).map(([sellerId, { seller, products: sellerProducts }]) => (
                <Card key={sellerId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{seller.business_name || 'Duka'}</h3>
                        <p className="text-xs text-muted-foreground">{sellerProducts.length} bidhaa</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sellerProducts.slice(0, 4).map(product => (
                        <div 
                          key={product.id} 
                          className="flex-shrink-0 w-24 cursor-pointer"
                          onClick={() => openProductDetail(product)}
                        >
                          <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground/50" />
                            )}
                          </div>
                          <p className="text-xs mt-1 line-clamp-1">{product.name}</p>
                          <p className="text-xs font-semibold text-primary">
                            TSh {product.price.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Orders Tab */}
        <TabsContent value="myorders" className="px-4 mt-2">
          {guestOrders.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Hakuna oda zako</h3>
              <p className="text-muted-foreground text-sm">
                Oda ulizowahi kuagiza zitaonekana hapa
              </p>
              <Button 
                onClick={() => setActiveTab('browse')} 
                className="mt-4"
                variant="outline"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Anza Kununua
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {guestOrders.map((order, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <code className="font-mono text-sm font-bold text-primary">
                          {order.tracking_code}
                        </code>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString('sw-TZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        TSh {order.total_amount.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {order.items.map(i => i.product_name).join(', ')}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/track-order?code=${encodeURIComponent(order.tracking_code.split(', ')[0])}&phone=${encodeURIComponent(order.customer_phone)}`)}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      Fuatilia Oda
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen && !paymentOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maelezo ya Oda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Jumla ya bidhaa: {cartCount}</p>
              <p className="text-lg font-bold text-primary">TSh {cartTotal.toLocaleString()}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Namba ya Simu *</label>
              <Input 
                placeholder="07xx xxx xxx" 
                className="mt-1" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Mahali pa Kupeleka *</label>
              <Input 
                placeholder="Eneo, mtaa, namba ya nyumba" 
                className="mt-1" 
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            {/* Payment Timing Choice */}
            <div>
              <label className="text-sm font-medium mb-2 block">Malipo</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentTiming === 'now' ? 'default' : 'outline'}
                  className="h-12 flex-col gap-1"
                  onClick={() => setPaymentTiming('now')}
                >
                  <span className="text-xs">💵 Lipa Sasa</span>
                  <span className="text-[10px] opacity-70">M-Pesa / Tigo Pesa</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentTiming === 'on_delivery' ? 'default' : 'outline'}
                  className="h-12 flex-col gap-1"
                  onClick={() => setPaymentTiming('on_delivery')}
                >
                  <span className="text-xs">📦 Lipa Unapopokea</span>
                  <span className="text-[10px] opacity-70">Cash on Delivery</span>
                </Button>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              disabled={!customerPhone || !deliveryAddress || customerPhone.length < 9}
              onClick={() => {
                if (paymentTiming === 'on_delivery') {
                  handlePaymentComplete('COD-' + Date.now(), 'cash_on_delivery');
                } else {
                  setPaymentOpen(true);
                }
              }}
            >
              {paymentTiming === 'on_delivery' ? 'Tuma Oda' : 'Endelea Kulipa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lipa kwa Simu</DialogTitle>
          </DialogHeader>
          <MobileMoneyPayment 
            amount={cartTotal}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Order Receipt Dialog */}
      {receiptData && (
        <OrderReceiptDialog
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            setReceiptData(null);
          }}
          trackingCodes={receiptData.trackingCodes}
          customerPhone={receiptData.customerPhone}
          deliveryAddress={receiptData.deliveryAddress}
          items={receiptData.items}
          totalAmount={receiptData.totalAmount}
          paymentMethod={receiptData.paymentMethod}
        />
      )}

      {/* Product Detail Modal */}
      <SokoniProductDetail
        product={selectedProduct}
        open={productDetailOpen}
        onClose={() => {
          setProductDetailOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={addToCart}
        relatedProducts={selectedProduct ? getRelatedProducts(selectedProduct) : []}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
        }}
      />

      {/* Bottom Navigation */}
      <SokoniBottomNav 
        cartCount={cartCount}
        onCartClick={() => setCartSheetOpen(true)}
      />

      {/* Cart Sheet */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Kikapu ({cartCount})
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Kikapu chako ni tupu</p>
              </div>
            ) : (
              cart.map(item => (
                <Card key={item.id} className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.owner_business_name}</p>
                      <p className="text-sm font-semibold text-primary">
                        TSh {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {cart.length > 0 && (
            <div className="border-t border-border pt-3 mt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Jumla:</span>
                <span className="text-primary">TSh {cartTotal.toLocaleString()}</span>
              </div>
              <Button 
                className="w-full mt-3" 
                size="lg"
                onClick={() => {
                  setCartSheetOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Endelea Kuoda
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
