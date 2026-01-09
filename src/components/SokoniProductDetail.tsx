import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Store, 
  Package, 
  Plus, 
  Minus,
  X,
  Heart,
  Share2,
  Star,
  Truck,
  ZoomIn,
  MessageSquare,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageZoom } from './ImageZoom';
import { ProductReviews } from './ProductReviews';

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

interface SokoniProductDetailProps {
  product: MarketProduct | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: MarketProduct, quantity: number) => void;
  relatedProducts: MarketProduct[];
  onSelectProduct: (product: MarketProduct) => void;
}

export const SokoniProductDetail = ({
  product,
  open,
  onClose,
  onAddToCart,
  relatedProducts,
  onSelectProduct,
}: SokoniProductDetailProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (product?.id) {
      fetchProductRating();
    }
  }, [product?.id]);

  const fetchProductRating = async () => {
    if (!product) return;
    
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', product.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
        setReviewCount(data.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
    }
  };

  if (!product) return null;

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: `Angalia ${product.name} - TSh ${product.price.toLocaleString()} kwenye Kiduka Sokoni`,
        url: window.location.href,
      });
    } catch {
      toast.success('Link imecopy!');
    }
  };

  const totalPrice = product.price * quantity;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[95vh] overflow-hidden rounded-2xl">
          {/* Product Image Section */}
          <div className="relative">
            <div 
              className="aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden cursor-zoom-in group"
              onClick={() => product.image_url && setImageZoomOpen(true)}
            >
              {product.image_url ? (
                <>
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                      <ZoomIn className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
            </div>
            
            {/* Close button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Action buttons */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className={`rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background ${isLiked ? 'text-red-500' : ''}`}
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Category badge */}
            {product.category && (
              <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground shadow-lg">
                {product.category}
              </Badge>
            )}

            {/* Zoom badge */}
            {product.image_url && (
              <Badge 
                variant="secondary" 
                className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm cursor-pointer hover:bg-background"
                onClick={() => setImageZoomOpen(true)}
              >
                <ZoomIn className="h-3 w-3 mr-1" />
                Zoom
              </Badge>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 300px)' }}>
            {/* Shop Info */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.owner_business_name || 'Duka'}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{averageRating > 0 ? averageRating.toFixed(1) : 'Mpya'}</span>
                  {reviewCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{reviewCount} maoni</span>
                    </>
                  )}
                  <span>•</span>
                  <Truck className="h-3 w-3" />
                  <span>Inapatikana</span>
                </div>
              </div>
            </div>
            
            {/* Product Name & Price */}
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">{product.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold text-primary">
                  TSh {product.price.toLocaleString()}
                </span>
                <Badge variant="outline" className="text-xs">
                  {product.stock_quantity} zinapatikana
                </Badge>
              </div>
            </div>

            {/* Tabs for Details and Reviews */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="details" className="gap-1 text-xs">
                  <Info className="h-3 w-3" />
                  Maelezo
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1 text-xs relative">
                  <MessageSquare className="h-3 w-3" />
                  Maoni
                  {reviewCount > 0 && (
                    <Badge className="ml-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]">
                      {reviewCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-3 space-y-3">
                {/* Description */}
                {product.description ? (
                  <div className="bg-muted/30 p-3 rounded-xl">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-3 rounded-xl text-center">
                    <p className="text-sm text-muted-foreground">Hakuna maelezo</p>
                  </div>
                )}
                
                {/* Quantity Selector */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <span className="text-sm font-medium">Kiasi</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      disabled={quantity >= product.stock_quantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-3">
                <ProductReviews productId={product.id} productName={product.name} />
              </TabsContent>
            </Tabs>
            
            {/* Add to Cart Button */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Jumla</p>
                <p className="text-xl font-bold text-primary">TSh {totalPrice.toLocaleString()}</p>
              </div>
              <Button 
                size="lg"
                className="flex-1 rounded-xl h-14 text-base gap-2"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5" />
                Ongeza
              </Button>
            </div>
            
            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  Zaidi kutoka {product.owner_business_name || 'Duka hili'}
                </h3>
                
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {relatedProducts.map((relProduct) => (
                      <CarouselItem key={relProduct.id} className="pl-2 basis-1/3">
                        <Card 
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-border"
                          onClick={() => onSelectProduct(relProduct)}
                        >
                          <div className="aspect-square bg-muted overflow-hidden">
                            {relProduct.image_url ? (
                              <img 
                                src={relProduct.image_url} 
                                alt={relProduct.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium line-clamp-1">{relProduct.name}</p>
                            <p className="text-xs font-bold text-primary mt-0.5">
                              TSh {relProduct.price.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      {product.image_url && (
        <ImageZoom
          src={product.image_url}
          alt={product.name}
          open={imageZoomOpen}
          onClose={() => setImageZoomOpen(false)}
        />
      )}
    </>
  );
};
