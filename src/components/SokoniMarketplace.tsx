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
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Search, 
  ShoppingCart, 
  Store, 
  MapPin, 
  Phone,
  Plus,
  Minus,
  Trash2,
  Package,
  Truck,
  ArrowLeft,
  ImageIcon,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MobileMoneyPayment } from './MobileMoneyPayment';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
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
}

interface CartItem extends MarketProduct {
  quantity: number;
}

interface SellerProfile {
  id: string;
  business_name: string | null;
  phone: string | null;
}

// Local storage key for guest cart
const GUEST_CART_KEY = 'sokoni_guest_cart';

// Helper to get/set guest cart
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

export const SokoniMarketplace = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => getGuestCart());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSeller, setIsSeller] = useState(false);

  const generateTrackingCode = () => {
    const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `SKN-${rand}`;
  };

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    setGuestCart(cart);
  }, [cart]);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      // Check if user is logged in (seller vs customer)
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Check if user has products (is a seller)
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        setIsSeller((count || 0) > 0);
      }

      // Fetch products directly from products table (public read via RLS)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, description, category, stock_quantity, image_url, owner_id')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Products fetch error:', productsError);
        throw productsError;
      }

      // Get unique seller IDs
      const sellerIds = [...new Set(productsData?.map(p => p.owner_id) || [])];

      // Fetch seller profiles (best-effort; may be blocked by privacy rules)
      let profilesData: SellerProfile[] = [];
      if (sellerIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, business_name, phone')
          .in('id', sellerIds);

        if (!error && data) profilesData = data as any;
      }

      setSellers(profilesData);

      // Enrich products with seller info (fallback to generic names)
      const enrichedProducts = (productsData || []).map(product => {
        const seller = profilesData?.find(p => p.id === product.owner_id);
        return {
          ...product,
          owner_business_name: seller?.business_name || 'Duka',
          owner_phone: seller?.phone || undefined
        };
      });

      setProducts(enrichedProducts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast.error('Imeshindwa kupakia bidhaa za sokoni');
      setLoading(false);
    }
  };

  const addToCart = (product: MarketProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} imeongezwa kwenye kikapu`);
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.owner_business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      // Group cart items by seller
      const sellerGroups = cart.reduce((acc, item) => {
        const sellerId = item.owner_id;
        if (!acc[sellerId]) acc[sellerId] = [];
        acc[sellerId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      const trackingCodes: string[] = [];

      // Create orders for each seller
      for (const [sellerId, items] of Object.entries(sellerGroups)) {
        const orderItems = items.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price
        }));

        const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const trackingCode = generateTrackingCode();
        trackingCodes.push(trackingCode);

        const { error: orderError } = await supabase
          .from('sokoni_orders')
          .insert({
            seller_id: sellerId,
            customer_phone: normalizedCustomerPhone,
            delivery_address: deliveryAddress,
            items: orderItems,
            total_amount: orderTotal,
            payment_method: method,
            payment_status: 'paid',
            order_status: 'new',
            transaction_id: transactionId,
            tracking_code: trackingCode,
          });

        if (orderError) {
          console.error('Order error:', orderError);
          throw orderError;
        }
      }

      toast.success('Oda yako imepokewa!', {
        description: `Namba za ufuatiliaji: ${trackingCodes.join(', ')} (Fuatilia: /track-order)`
      });

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
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-6 w-6" />
            <h1 className="text-lg font-bold">Kiduka Sokoni</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Show seller dashboard link for sellers */}
            {isSeller && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => navigate('/sokoni-orders')}
              >
                <Truck className="h-4 w-4 mr-1" />
                Oda Zangu
              </Button>
            )}

            {/* Customer tracking */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/track-order')}
            >
              <Package className="h-4 w-4 mr-1" />
              Fuatilia Oda
            </Button>
            
            {/* Cart - For customers */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Kikapu ({cartCount})
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Kikapu chako ni tupu</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ongeza bidhaa kutoka sokoni
                      </p>
                    </div>
                  ) : (
                    <>
                      {cart.map(item => (
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
                      ))}
                      
                      <div className="border-t border-border pt-3 mt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Jumla:</span>
                          <span className="text-primary">TSh {cartTotal.toLocaleString()}</span>
                        </div>
                        <Button 
                          className="w-full mt-3" 
                          size="lg"
                          onClick={() => setCheckoutOpen(true)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Endelea Kuoda
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-primary-foreground/70" />
          <Input
            placeholder="Tafuta bidhaa, duka..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/70"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 32px)' }}>
          <TabsTrigger value="browse" className="text-xs">
            <Package className="h-4 w-4 mr-1" />
            Bidhaa
          </TabsTrigger>
          <TabsTrigger value="stores" className="text-xs">
            <Store className="h-4 w-4 mr-1" />
            Maduka
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="browse" className="px-4 mt-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Hakuna bidhaa sokoni</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Hakuna matokeo ya utafutaji' : 'Wafanyabiashara hawajaongeza bidhaa bado'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden border-border">
                  <div className="aspect-square bg-muted flex items-center justify-center relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                    )}
                    {product.category && (
                      <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.owner_business_name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">
                        TSh {product.price.toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {product.stock_quantity} pcs
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Ongeza
                    </Button>
                  </CardContent>
                </Card>
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
              <p className="text-muted-foreground text-sm">
                Maduka yataonekana hapa
              </p>
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
                        <p className="text-xs text-muted-foreground">
                          {sellerProducts.length} bidhaa
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sellerProducts.slice(0, 4).map(product => (
                        <div key={product.id} className="flex-shrink-0 w-24">
                          <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover rounded-md"
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
            
            <Button 
              className="w-full" 
              size="lg"
              disabled={!customerPhone || !deliveryAddress || customerPhone.length < 9}
              onClick={() => setPaymentOpen(true)}
            >
              Endelea Kulipa
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
    </div>
  );
};
