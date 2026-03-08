import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, Store, Package, Plus, Minus,
  Heart, Share2, Star, Truck, ZoomIn,
  MessageSquare, Info, ChevronLeft, ChevronRight,
  ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageZoom } from './ImageZoom';
import { ProductReviews } from './ProductReviews';
import { useWishlist } from '@/hooks/useWishlist';
import { SokoniLogo } from './SokoniLogo';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
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
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    if (product?.id) {
      fetchProductRating();
      fetchProductImages();
      setCurrentImageIndex(0);
      setQuantity(1);
    }
  }, [product?.id]);

  useEffect(() => {
    const images = getAllImages();
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [productImages, product?.image_url]);

  const fetchProductImages = async () => {
    if (!product) return;
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setProductImages(data && data.length > 0 ? data : []);
    } catch (error) {
      console.error('Error fetching product images:', error);
      setProductImages([]);
    }
  };

  const fetchProductRating = async () => {
    if (!product) return;
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', product.id);
      if (error) throw error;
      if (data && data.length > 0) {
        setAverageRating(data.reduce((sum, r) => sum + r.rating, 0) / data.length);
        setReviewCount(data.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
    }
  };

  const getAllImages = (): string[] => {
    if (!product) return [];
    const images: string[] = [];
    productImages.forEach(img => images.push(img.image_url));
    if (product.image_url && images.length === 0) {
      images.push(product.image_url);
    }
    return images;
  };

  const allImages = getAllImages();
  const currentImage = allImages[currentImageIndex] || product?.image_url;

  const handleToggleWishlist = () => {
    if (!product) return;
    const added = toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      owner_business_name: product.owner_business_name,
    });
    toast.success(added ? 'Imeongezwa kwenye favorites!' : 'Imeondolewa kwenye favorites');
  };

  if (!product || !open) return null;

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  const handleShare = async () => {
    const shareText = `Angalia ${product.name} - TSh ${product.price.toLocaleString()} kwenye Kiduka Sokoni`;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: shareUrl });
        return;
      } catch (e) { /* fall through */ }
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Inafungua WhatsApp...');
  };

  const totalPrice = product.price * quantity;
  const isLiked = isInWishlist(product.id);

  const nextImage = () => {
    if (allImages.length > 1) setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };
  const prevImage = () => {
    if (allImages.length > 1) setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };
  const openZoom = (url: string) => {
    setZoomImageUrl(url);
    setImageZoomOpen(true);
  };

  return (
    <>
      {/* Full-page overlay */}
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SokoniLogo size="sm" />
          <div className="flex-1" />
          <Button 
            variant="ghost" size="icon"
            className={`${isLiked ? 'text-red-500' : ''}`}
            onClick={handleToggleWishlist}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {/* Split Layout */}
          <div className="flex flex-col lg:flex-row gap-6 relative">
            {/* Center Divider - Tree line (desktop) */}
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
              <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
              <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
              <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
                <div className="absolute top-1/4 left-0 -translate-x-full pr-2">
                  <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
                </div>
                <div className="absolute top-1/4 right-0 translate-x-full pl-2">
                  <ArrowUpRight className="h-3 w-3 text-primary/40" />
                </div>
                <div className="absolute top-3/4 left-0 -translate-x-full pr-2">
                  <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
                </div>
                <div className="absolute top-3/4 right-0 translate-x-full pl-2">
                  <ArrowUpRight className="h-3 w-3 text-primary/40" />
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
              <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
            </div>

            {/* LEFT SIDE - Related Products & Shop Info */}
            <div className="flex-1 lg:pr-8 order-2 lg:order-1 space-y-4">
              {/* Shop Info Card */}
              <Card className="rounded-3xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{product.owner_business_name || 'Duka'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                </CardContent>
              </Card>

              {/* Related Products from same business */}
              {relatedProducts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 px-1">
                    <Store className="h-4 w-4 text-primary" />
                    Zaidi kutoka {product.owner_business_name || 'Duka hili'}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {relatedProducts.map((relProduct) => (
                      <Card 
                        key={relProduct.id}
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group border-0 bg-card rounded-3xl"
                        onClick={() => onSelectProduct(relProduct)}
                      >
                        <div className="aspect-square bg-muted overflow-hidden">
                          {relProduct.image_url ? (
                            <img 
                              src={relProduct.image_url} 
                              alt={relProduct.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{relProduct.name}</p>
                          <p className="text-sm font-bold text-primary mt-1">
                            TSh {relProduct.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {relProduct.owner_business_name || 'Duka'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section (desktop) */}
              <div className="hidden lg:block">
                <Card className="rounded-3xl">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Maoni ({reviewCount})
                    </h3>
                    <ProductReviews productId={product.id} productName={product.name} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* RIGHT SIDE - Product Details & Purchase */}
            <div className="flex-1 lg:pl-8 order-1 lg:order-2 space-y-4">
              {/* Product Image */}
              <Card className="rounded-3xl overflow-hidden">
                <div 
                  className="relative aspect-square sm:aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 overflow-hidden cursor-zoom-in group"
                  onClick={() => currentImage && openZoom(currentImage)}
                >
                  {currentImage ? (
                    <>
                      <img 
                        src={currentImage} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                          <ZoomIn className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-20 w-20 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Navigation arrows */}
                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="secondary" size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-lg h-9 w-9"
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary" size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-lg h-9 w-9"
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            className={`h-2 rounded-full transition-all ${
                              idx === currentImageIndex ? 'w-5 bg-primary' : 'w-2 bg-white/60'
                            }`}
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Category badge */}
                  {product.category && (
                    <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground shadow-lg">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </Card>

              {/* Product Name & Price */}
              <Card className="rounded-3xl">
                <CardContent className="p-4 space-y-3">
                  <h1 className="text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-primary">
                      TSh {product.price.toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {product.stock_quantity} zinapatikana
                    </Badge>
                  </div>

                  {/* Tabs for Details and Reviews (mobile) */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:hidden">
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
                    <TabsContent value="details" className="mt-3">
                      {product.description ? (
                        <div className="bg-muted/30 p-3 rounded-2xl">
                          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                        </div>
                      ) : (
                        <div className="bg-muted/30 p-3 rounded-2xl text-center">
                          <p className="text-sm text-muted-foreground">Hakuna maelezo</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="reviews" className="mt-3">
                      <ProductReviews productId={product.id} productName={product.name} />
                    </TabsContent>
                  </Tabs>

                  {/* Description (desktop - always visible) */}
                  <div className="hidden lg:block">
                    {product.description ? (
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Maelezo
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                      </div>
                    ) : (
                      <div className="bg-muted/30 p-4 rounded-2xl text-center">
                        <p className="text-sm text-muted-foreground">Hakuna maelezo ya ziada</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quantity & Add to Cart - Sticky on mobile */}
              <Card className="rounded-3xl sticky bottom-20 lg:relative lg:bottom-auto shadow-lg lg:shadow-none">
                <CardContent className="p-4 space-y-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Kiasi</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline" size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                      <Button
                        variant="outline" size="icon"
                        className="h-10 w-10 rounded-[20%]"
                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                        disabled={quantity >= product.stock_quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Total & Add Button */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Jumla</p>
                      <p className="text-2xl font-bold text-primary">TSh {totalPrice.toLocaleString()}</p>
                    </div>
                    <Button 
                      size="lg"
                      className="flex-1 h-14 text-base gap-2 rounded-[20%]"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Ongeza Kwenye Kikapu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoom
        src={zoomImageUrl || currentImage || ''}
        alt={product.name}
        open={imageZoomOpen}
        onClose={() => setImageZoomOpen(false)}
      />
    </>
  );
};
