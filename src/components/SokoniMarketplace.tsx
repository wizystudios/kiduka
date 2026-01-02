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
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MobileMoneyPayment } from './MobileMoneyPayment';

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
  owner_location?: string;
}

interface CartItem extends MarketProduct {
  quantity: number;
}

interface MarketListing {
  id: string;
  product_name: string;
  description: string | null;
  price: number | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  status: string | null;
  listing_type: string;
  seller_id: string;
  contact_info: any;
  created_at: string;
}

export const SokoniMarketplace = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const { data: listingsData, error: listingsError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);
      
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

  const filteredListings = listings.filter(listing =>
    listing.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePaymentComplete = (transactionId: string, method: string) => {
    toast.success('Oda yako imepokewa! Wafanyabiashara watawasiliana nawe.');
    setCart([]);
    setPaymentOpen(false);
    setCheckoutOpen(false);
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
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-white/20"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-6 w-6" />
            <h1 className="text-xl font-bold">Kiduka Sokoni</h1>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
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
                  </div>
                ) : (
                  <>
                    {cart.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
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
                    
                    <div className="border-t pt-3 mt-4">
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

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-primary-foreground/70" />
          <Input
            placeholder="Tafuta bidhaa, duka, eneo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/20 border-white/30 text-primary-foreground placeholder:text-primary-foreground/70"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 m-2 mx-4" style={{ width: 'calc(100% - 32px)' }}>
          <TabsTrigger value="browse">
            <Package className="h-4 w-4 mr-1" />
            Bidhaa
          </TabsTrigger>
          <TabsTrigger value="stores">
            <Store className="h-4 w-4 mr-1" />
            Maduka
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Truck className="h-4 w-4 mr-1" />
            Oda Zangu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="px-4 mt-2">
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hakuna bidhaa sokoni</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Hakuna matokeo ya utafutaji' : 'Wafanyabiashara hawajaongeza bidhaa bado'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{listing.product_name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {listing.contact_info?.business_name || 'Duka'}
                    </p>
                    {listing.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{listing.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">
                        TSh {listing.price?.toLocaleString() || '---'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {listing.quantity} {listing.unit || 'pcs'}
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        const productForCart: MarketProduct = {
                          id: listing.id,
                          name: listing.product_name,
                          price: listing.price || 0,
                          description: listing.description,
                          category: null,
                          stock_quantity: listing.quantity,
                          image_url: null,
                          owner_id: listing.seller_id,
                          owner_business_name: listing.contact_info?.business_name,
                          owner_phone: listing.contact_info?.phone,
                          owner_location: listing.location || undefined
                        };
                        addToCart(productForCart);
                      }}
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

        <TabsContent value="stores" className="px-4 mt-2">
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Maduka</h3>
            <p className="text-muted-foreground text-sm">
              Orodha ya maduka itaonyeshwa hapa
            </p>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="px-4 mt-2">
          <div className="text-center py-12">
            <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Oda Zangu</h3>
            <p className="text-muted-foreground text-sm">
              Oda zako zitaonyeshwa hapa baada ya kununua
            </p>
          </div>
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
              onClick={() => setPaymentOpen(true)}
              disabled={!customerPhone || !deliveryAddress}
            >
              Endelea Kulipa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
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

export default SokoniMarketplace;
