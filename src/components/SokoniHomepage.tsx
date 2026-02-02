import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, ShoppingCart, Store, Package, Star, 
  ChevronRight, Sparkles, TrendingUp, Clock, Heart,
  Grid3X3, ArrowLeft, Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  created_at?: string;
}

interface CategoryItem {
  name: string;
  icon: string;
  count: number;
}

export const SokoniHomepage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('id, name, price, description, category, stock_quantity, image_url, owner_id, created_at')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set(productsData?.map(p => p.owner_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, business_name')
        .in('id', sellerIds);

      const enriched = (productsData || []).map(p => ({
        ...p,
        owner_business_name: profiles?.find(pr => pr.id === p.owner_id)?.business_name || 'Duka'
      }));

      setProducts(enriched);

      // Build categories
      const catMap: Record<string, number> = {};
      enriched.forEach(p => {
        const cat = p.category || 'Nyingine';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      setCategories(Object.entries(catMap).map(([name, count]) => ({
        name,
        icon: getCategoryIcon(name),
        count
      })).slice(0, 8));

    } catch (error) {
      console.error('Error:', error);
      toast.error('Imeshindwa kupakia bidhaa');
    } finally {
      setLoading(false);
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

  // Get top deals (lowest prices)
  const topDeals = [...products]
    .sort((a, b) => a.price - b.price)
    .slice(0, 6);

  // Get new arrivals
  const newArrivals = products.slice(0, 6);

  // Get top ranking (mock - could be based on sales)
  const topRanking = [...products]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  const ProductCard = ({ product, showDiscount = false }: { product: MarketProduct; showDiscount?: boolean }) => (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 bg-card"
      onClick={() => navigate(`/sokoni?product=${product.id}`)}
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
          className="absolute top-2 right-2 bg-background/80 hover:bg-background h-8 w-8"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Heart className="h-4 w-4" />
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
        {showDiscount && (
          <Badge variant="secondary" className="mt-1 text-xs bg-destructive/10 text-destructive">
            -15% OFF
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-muted-foreground">Inapakia Sokoni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
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
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/sokoni?search=${searchTerm}`)}
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-primary-foreground/10 relative"
            onClick={() => navigate('/sokoni')}
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card border-b">
        <div className="overflow-x-auto">
          <div className="flex gap-2 p-3 min-w-max">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full flex items-center gap-2"
              onClick={() => navigate('/sokoni')}
            >
              <Grid3X3 className="h-4 w-4" />
              Kategoria Zote
            </Button>
            {categories.slice(0, 5).map(cat => (
              <Button 
                key={cat.name}
                variant="ghost" 
                size="sm" 
                className="rounded-full"
                onClick={() => navigate(`/sokoni?category=${cat.name}`)}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
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
                onClick={() => navigate('/sokoni')}
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
              onClick={() => navigate('/sokoni')}
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

        {/* Top Ranking & New Arrivals - Side by Side on Desktop */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Ranking */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="font-bold">Top Ranking</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sokoni')}>
                Zaidi <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {topRanking.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* New Arrivals */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h2 className="font-bold">Bidhaa Mpya</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sokoni')}>
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

        {/* All Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Bidhaa Zote</h2>
            <span className="text-sm text-muted-foreground">{products.length} bidhaa</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.slice(0, 20).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length > 20 && (
            <div className="text-center mt-4">
              <Button onClick={() => navigate('/sokoni')}>
                Tazama Zaidi ({products.length - 20}+)
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
