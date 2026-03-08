import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Store, Package, Search, ShoppingCart, Phone, MapPin, Star, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SokoniLogo } from '@/components/SokoniLogo';
import { toast } from 'sonner';

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  stock_quantity: number;
  image_url: string | null;
}

interface StoreProfile {
  id: string;
  business_name: string | null;
  phone: string | null;
  region: string | null;
  district: string | null;
  store_description: string | null;
  store_logo_url: string | null;
  google_pixel_id: string | null;
  facebook_pixel_id: string | null;
}

export const StorefrontPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (slug) fetchStore();
  }, [slug]);

  // Inject tracking pixels
  useEffect(() => {
    if (!store) return;
    
    if (store.facebook_pixel_id) {
      const script = document.createElement('script');
      script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${store.facebook_pixel_id}');fbq('track','PageView');`;
      document.head.appendChild(script);
      return () => { document.head.removeChild(script); };
    }
  }, [store]);

  useEffect(() => {
    if (!store?.google_pixel_id) return;
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${store.google_pixel_id}`;
    script.async = true;
    document.head.appendChild(script);
    
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${store.google_pixel_id}');`;
    document.head.appendChild(inlineScript);
    
    return () => {
      document.head.removeChild(script);
      document.head.removeChild(inlineScript);
    };
  }, [store]);

  const fetchStore = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, business_name, phone, region, district, store_description, store_logo_url, google_pixel_id, facebook_pixel_id')
        .eq('store_slug', slug)
        .maybeSingle();

      if (error || !profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStore(profile as any);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, description, category, stock_quantity, image_url')
        .eq('owner_id', profile.id)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching store:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <SokoniLogo size="lg" animate />
          <p className="text-sm text-muted-foreground mt-2">Inapakia duka...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Store className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Duka Halipatikani</h1>
          <p className="text-sm text-muted-foreground">Duka "{slug}" halipo au limeondolewa</p>
          <Button onClick={() => navigate('/sokoni')}>Rudi Sokoni</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Store Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/sokoni')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SokoniLogo size="sm" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              {store?.store_logo_url ? (
                <img src={store.store_logo_url} alt="Logo" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <Store className="h-8 w-8" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{store?.business_name || 'Duka'}</h1>
              {store?.store_description && <p className="text-sm opacity-80">{store.store_description}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                {store?.region && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {store.district ? `${store.district}, ` : ''}{store.region}
                  </span>
                )}
                <span>{products.length} bidhaa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tafuta bidhaa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Hakuna bidhaa</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/sokoni?product=${product.id}`)}
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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
                </div>
                <CardContent className="p-2">
                  <h3 className="text-xs font-medium line-clamp-2">{product.name}</h3>
                  <p className="text-sm font-bold text-primary mt-1">TSh {product.price.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Share button */}
        <div className="text-center mt-8 pb-8">
          <Button
            variant="outline"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: store?.business_name || 'Duka', url });
              } else {
                navigator.clipboard.writeText(url);
                toast.success('Link imenakiliwa!');
              }
            }}
          >
            📤 Shiriki Duka Hili
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPage;
