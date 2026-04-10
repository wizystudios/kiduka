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
  ClipboardList, Truck, Eye, Grid3X3, ArrowUpRight, MapPin
} from 'lucide-react';
import { SokoniLogo } from './SokoniLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MobileMoneyPayment } from './MobileMoneyPayment';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
import { OrderReceiptDialog } from './OrderReceiptDialog';
import { SokoniProductDetail } from './SokoniProductDetail';
import { useWishlist } from '@/hooks/useWishlist';
import { SokoniBottomNav } from './SokoniBottomNav';
import { ImageSearchModal } from './ImageSearchModal';
import { estimateDeliveryDays, getDeliveryEstimateColor } from '@/utils/deliveryEstimation';
interface ActiveDiscount {
  id: string;
  discount_type: string;
  value: number;
  applicable_products: string[];
}

interface MarketProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  stock_quantity: number;
  image_url: string | null;
  owner_id: string;
  branch_id?: string | null;
  branch_name?: string;
  owner_business_name?: string;
  owner_phone?: string;
  owner_region?: string;
  owner_district?: string;
  created_at?: string;
  discount_price?: number;
  discount_percent?: number;
}

interface CartItem extends MarketProduct {
  quantity: number;
}

interface SellerProfile {
  id: string;
  business_name: string | null;
  phone: string | null;
  region: string | null;
  district: string | null;
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
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
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
        const [countResult, profileResult] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
          supabase.from('profiles').select('region, district').eq('id', user.id).maybeSingle()
        ]);

        setIsSeller((countResult.count || 0) > 0);
        if (profileResult.data) {
          setUserRegion((profileResult.data as any).region || null);
          setUserDistrict((profileResult.data as any).district || null);
        }
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, description, category, stock_quantity, image_url, owner_id, created_at, branch_id')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const sellerIds = [...new Set(productsData?.map(p => p.owner_id) || [])];

      let profilesData: SellerProfile[] = [];
      let discountsData: ActiveDiscount[] = [];
      let branchesData: { id: string; branch_name: string }[] = [];
      
      if (sellerIds.length > 0) {
        const branchIds = [...new Set((productsData || []).map(p => (p as any).branch_id).filter(Boolean))];
        
        const fetchPromises: Promise<any>[] = [
          supabase.from('profiles').select('id, business_name, phone, region, district').in('id', sellerIds),
          supabase.from('discounts').select('id, discount_type, value, applicable_products').eq('active', true)
            .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
        ];
        
        if (branchIds.length > 0) {
          fetchPromises.push(
            supabase.from('business_branches').select('id, branch_name').in('id', branchIds)
          );
        }

        const results = await Promise.all(fetchPromises);
        
        if (!results[0].error && results[0].data) profilesData = results[0].data as any;
        if (!results[1].error && results[1].data) {
          discountsData = (results[1].data as any[]).map(d => ({
            ...d,
            applicable_products: Array.isArray(d.applicable_products) ? d.applicable_products : []
          }));
        }
        if (results[2] && !results[2].error && results[2].data) {
          branchesData = results[2].data as any;
        }
      }

      setSellers(profilesData);

      const enrichedProducts = (productsData || []).map(product => {
        const seller = profilesData?.find(p => p.id === product.owner_id);
        
        // Find applicable discount
        let discount_price: number | undefined;
        let discount_percent: number | undefined;
        
        for (const disc of discountsData) {
          const applies = disc.applicable_products.length === 0 || disc.applicable_products.includes(product.id);
          if (applies) {
            if (disc.discount_type === 'percentage') {
              discount_price = product.price * (1 - disc.value / 100);
              discount_percent = disc.value;
            } else {
              discount_price = Math.max(0, product.price - disc.value);
              discount_percent = Math.round((disc.value / product.price) * 100);
            }
            break; // Apply first matching discount
          }
        }
        
        return {
          ...product,
          owner_business_name: seller?.business_name || 'Duka',
          owner_phone: seller?.phone || undefined,
          owner_region: seller?.region || undefined,
          owner_district: seller?.district || undefined,
          discount_price,
          discount_percent
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

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal - couponDiscount);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const sellerIds = [...new Set(cart.map(i => i.owner_id))];
      const { data, error } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('is_active', true)
        .ilike('code', couponCode.trim().toUpperCase())
        .in('owner_id', sellerIds)
        .maybeSingle();

      if (error || !data) {
        toast.error('Coupon code si sahihi au haifanyi kazi');
        setCouponDiscount(0);
        setCouponApplied(false);
        setValidatingCoupon(false);
        return;
      }

      const coupon = data as any;
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error('Coupon imeisha muda');
        setValidatingCoupon(false);
        return;
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error('Coupon imekwisha matumizi');
        setValidatingCoupon(false);
        return;
      }
      if (coupon.min_order_amount && cartSubtotal < coupon.min_order_amount) {
        toast.error(`Oda ya chini ni TSh ${coupon.min_order_amount.toLocaleString()}`);
        setValidatingCoupon(false);
        return;
      }

      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = Math.round(cartSubtotal * (coupon.discount_value / 100));
      } else {
        discount = coupon.discount_value;
      }
      
      setCouponDiscount(discount);
      setCouponApplied(true);
      toast.success(`Punguzo la TSh ${discount.toLocaleString()} limeongezwa!`);

      // Increment used_count
      await supabase.from('coupon_codes').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id);
    } catch (e) {
      toast.error('Imeshindwa kuthibitisha coupon');
    }
    setValidatingCoupon(false);
  };

  // Track abandoned cart when user has items but leaves checkout
  useEffect(() => {
    if (!checkoutOpen || cart.length === 0 || !customerPhone || customerPhone.length < 9) return;
    
    const timeout = setTimeout(async () => {
      const normalizedPhone = normalizeTzPhoneDigits(customerPhone);
      if (!normalizedPhone) return;
      
      const sellerIds = [...new Set(cart.map(i => i.owner_id))];
      for (const sellerId of sellerIds) {
        const sellerItems = cart.filter(i => i.owner_id === sellerId);
        await supabase.from('abandoned_carts').insert({
          customer_phone: normalizedPhone,
          seller_id: sellerId,
          items: sellerItems.map(i => ({ product_name: i.name, quantity: i.quantity, unit_price: i.price })),
          total_amount: sellerItems.reduce((s, i) => s + i.price * i.quantity, 0),
        });
      }
    }, 60000); // Track after 1 minute of being on checkout

    return () => clearTimeout(timeout);
  }, [checkoutOpen, customerPhone]);

  // Location proximity score: 0 = same district, 1 = same region, 2 = different region
  const getLocationScore = (product: MarketProduct) => {
    if (!userRegion) return 1; // No user location, neutral
    if (product.owner_district && userDistrict && product.owner_district === userDistrict) return 0;
    if (product.owner_region && product.owner_region === userRegion) return 1;
    return 2;
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.owner_business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => getLocationScore(a) - getLocationScore(b));

  // Get top deals - products with real discounts first, then lowest prices
  const topDeals = [...products]
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0) || a.price - b.price)
    .slice(0, 6);

  // Get new arrivals
  const newArrivals = products.slice(0, 6);

  // Get top ranking
  const topRanking = [...products].sort(() => Math.random() - 0.5).slice(0, 4);

  // Group products by seller for "Maduka" tab
  const productsBySeller = products.reduce((acc, product) => {
    const sellerId = product.owner_id;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller: sellers.find(s => s.id === sellerId) || { id: sellerId, business_name: 'Duka', phone: null, region: null, district: null },
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

      // Mark abandoned carts as recovered
      await supabase
        .from('abandoned_carts')
        .update({ recovered: true })
        .eq('customer_phone', normalizedCustomerPhone)
        .eq('recovered', false);

      setCart([]);
      setCustomerPhone('');
      setDeliveryAddress('');
      setCouponCode('');
      setCouponDiscount(0);
      setCouponApplied(false);
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
  const ProductCard = ({ product }: { product: MarketProduct }) => {
    const hasDiscount = !!product.discount_price;
    const displayPrice = product.discount_price || product.price;
    
    return (
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
        {hasDiscount && (
          <Badge className="absolute bottom-2 left-2 text-xs bg-destructive text-destructive-foreground">
            -{product.discount_percent}%
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
        {product.owner_region && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {product.owner_district ? `${product.owner_district}, ` : ''}{product.owner_region}
            </span>
            {userRegion && product.owner_region === userRegion && (
              <Badge className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border-0">Karibu</Badge>
            )}
          </div>
        )}
        <div className="mt-2">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through mr-2">
              TSh {product.price.toLocaleString()}
            </span>
          )}
          <span className={`font-bold ${hasDiscount ? 'text-destructive' : 'text-primary'}`}>
            TSh {Math.round(displayPrice).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="text-xs ml-auto">
            {product.stock_quantity} pcs
          </Badge>
        </div>
        <Button 
          size="sm" 
          className="w-full mt-2 group-hover:bg-primary/90"
          onClick={(e) => {
            e.stopPropagation();
            addToCart({ ...product, price: displayPrice }, 1);
          }}
        >
          <ShoppingCart className="h-3 w-3 mr-1" />
          Ongeza
        </Button>
      </CardContent>
    </Card>
    );
  };

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
      {/* Header with Sokoni Logo */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="flex items-center gap-2 p-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Sokoni Logo */}
          <SokoniLogo size="sm" showText={false} />
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
              onClick={() => setImageSearchOpen(true)}
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
                <ProductCard key={product.id} product={product} />
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

      {/* Checkout Full-Page Overlay */}
      {checkoutOpen && !paymentOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCheckoutOpen(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SokoniLogo size="sm" />
            <h2 className="font-bold text-sm">Maelezo ya Oda</h2>
          </div>

          <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-6 relative min-h-0">
              {/* Center Divider */}
              <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
                <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
                <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
                <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
                  <div className="absolute top-1/3 left-0 -translate-x-full pr-2">
                    <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
                  </div>
                  <div className="absolute top-1/3 right-0 translate-x-full pl-2">
                    <ArrowUpRight className="h-3 w-3 text-primary/40" />
                  </div>
                  <div className="absolute top-2/3 left-0 -translate-x-full pr-2">
                    <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
                  </div>
                  <div className="absolute top-2/3 right-0 translate-x-full pl-2">
                    <ArrowUpRight className="h-3 w-3 text-primary/40" />
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
                <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
              </div>

              {/* LEFT - Order Summary */}
              <div className="flex-1 lg:pr-8 space-y-4">
                <Card className="rounded-3xl">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      Bidhaa ({cartCount})
                    </h3>
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-2xl">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.owner_business_name} • x{item.quantity}</p>
                        </div>
                        <span className="font-bold text-primary ml-2">TSh {(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    
                    {/* Coupon Code */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground">Coupon Code</label>
                        <Input
                          placeholder="KARIBU10"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="mt-1 rounded-2xl text-xs"
                          disabled={couponApplied}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant={couponApplied ? 'secondary' : 'outline'}
                        onClick={couponApplied ? () => { setCouponApplied(false); setCouponDiscount(0); setCouponCode(''); } : validateCoupon}
                        disabled={validatingCoupon}
                        className="rounded-2xl"
                      >
                        {couponApplied ? '✕ Ondoa' : validatingCoupon ? '...' : 'Tumia'}
                      </Button>
                    </div>
                    {couponApplied && couponDiscount > 0 && (
                      <div className="flex justify-between text-xs text-green-600 dark:text-green-400 px-1">
                        <span>Punguzo la Coupon</span>
                        <span>-TSh {couponDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Jumla ndogo</span>
                          <span>TSh {cartSubtotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Jumla</span>
                        <span className="text-primary">TSh {cartTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT - Customer Info & Payment */}
              <div className="flex-1 lg:pl-8 space-y-4">
                <Card className="rounded-3xl">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold text-sm">Taarifa za Mteja</h3>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Namba ya Simu *</label>
                      <Input 
                        placeholder="07xx xxx xxx" 
                        className="mt-1 rounded-2xl" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Mahali pa Kupeleka *</label>
                      <Input 
                        placeholder="Eneo, mtaa, namba ya nyumba" 
                        className="mt-1 rounded-2xl" 
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </div>

                    {/* Delivery Estimation */}
                    {cart.length > 0 && userRegion && (
                      <div className="bg-muted/50 rounded-2xl p-3 space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Makadirio ya Usafirishaji
                        </h4>
                        {Object.entries(
                          cart.reduce((acc, item) => {
                            const region = item.owner_region || 'Unknown';
                            if (!acc[region]) acc[region] = [];
                            acc[region].push(item.name);
                            return acc;
                          }, {} as Record<string, string[]>)
                        ).map(([region, items]) => {
                          const est = estimateDeliveryDays(region === 'Unknown' ? null : region, userRegion);
                          return (
                            <div key={region} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground truncate">{region}</span>
                              <span className={`font-medium ${getDeliveryEstimateColor(est.min)}`}>
                                📦 {est.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Malipo</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={paymentTiming === 'now' ? 'default' : 'outline'}
                          className="h-14 flex-col gap-1"
                          onClick={() => setPaymentTiming('now')}
                        >
                          <span className="text-xs">💵 Lipa Sasa</span>
                          <span className="text-[10px] opacity-70">M-Pesa / Tigo Pesa</span>
                        </Button>
                        <Button
                          type="button"
                          variant={paymentTiming === 'on_delivery' ? 'default' : 'outline'}
                          className="h-14 flex-col gap-1"
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
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Full-Page Overlay */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPaymentOpen(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SokoniLogo size="sm" />
            <h2 className="font-bold text-sm">Lipa kwa Simu</h2>
          </div>
          <div className="max-w-md mx-auto p-4 md:p-6">
            <Card className="rounded-3xl">
              <CardContent className="p-4">
                <MobileMoneyPayment 
                  amount={cartTotal}
                  onPaymentComplete={handlePaymentComplete}
                  onCancel={() => setPaymentOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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

      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onClose={() => setImageSearchOpen(false)} />
    </div>
  );
};
