import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ArrowLeft, 
  Trash2, 
  ShoppingCart, 
  Package,
  Store,
  HeartOff
} from 'lucide-react';
import { useWishlist, WishlistItem } from '@/hooks/useWishlist';
import { toast } from 'sonner';

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, clearWishlist, wishlistCount } = useWishlist();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = (item: WishlistItem) => {
    setRemovingId(item.id);
    setTimeout(() => {
      removeFromWishlist(item.id);
      setRemovingId(null);
      toast.success(`${item.name} imeondolewa`);
    }, 200);
  };

  const handleClearAll = () => {
    if (confirm('Una uhakika unataka kufuta favorites zote?')) {
      clearWishlist();
      toast.success('Favorites zote zimefutwa');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sw-TZ', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate('/sokoni')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Heart className="h-6 w-6" />
            <h1 className="text-lg font-bold">Favorites Zangu</h1>
          </div>
          
          {wishlistCount > 0 && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleClearAll}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Futa Zote
            </Button>
          )}
        </div>
      </div>

      {/* Wishlist Content */}
      <div className="p-4">
        {wishlistCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <HeartOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Hakuna Favorites</h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Bonyeza ❤️ kwenye bidhaa unayopenda kwenye Sokoni ili kuihifadhi hapa
            </p>
            <Button onClick={() => navigate('/sokoni')} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Rudi Sokoni
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Bidhaa {wishlistCount} zimehifadhiwa
              </p>
            </div>

            {wishlist.map((item) => (
              <Card 
                key={item.id} 
                className={`overflow-hidden border-border transition-all duration-200 ${
                  removingId === item.id ? 'opacity-50 scale-95' : ''
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Product Image */}
                    <div 
                      className="w-28 h-28 flex-shrink-0 bg-muted cursor-pointer"
                      onClick={() => navigate('/sokoni')}
                    >
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {item.name}
                        </h3>
                        {item.owner_business_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Store className="h-3 w-3" />
                            <span>{item.owner_business_name}</span>
                          </div>
                        )}
                        <p className="text-lg font-bold text-primary mt-1">
                          TSh {item.price.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          Imeongezwa: {formatDate(item.addedAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(item)}
                        >
                          <Heart className="h-4 w-4 fill-current mr-1" />
                          Ondoa
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Back to Shop Button */}
            <div className="pt-4">
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={() => navigate('/sokoni')}
              >
                <ShoppingCart className="h-5 w-5" />
                Endelea Kununua
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
