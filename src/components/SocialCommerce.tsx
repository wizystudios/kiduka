
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Star, 
  MessageSquare, 
  Users, 
  TrendingUp,
  Instagram,
  Facebook,
  Eye,
  Heart,
  ThumbsUp,
  Camera,
  Video,
  Hash
} from 'lucide-react';

interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  review_text?: string;
  is_verified_purchase: boolean;
  created_at: string;
  customer?: {
    name: string;
  };
  product?: {
    name: string;
  };
}

interface SocialShare {
  id: string;
  product_id: string;
  platform: string;
  share_url: string;
  click_count: number;
  conversion_count: number;
  created_at: string;
  product?: {
    name: string;
    price: number;
    image_url?: string;
  };
}

interface SocialPost {
  id: string;
  product_id: string;
  platform: string;
  content: string;
  hashtags: string[];
  media_urls: string[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  created_at: string;
}

export const SocialCommerce = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [shares, setShares] = useState<SocialShare[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [newPost, setNewPost] = useState({
    content: '',
    platform: 'instagram',
    hashtags: '',
    selectedProducts: [] as string[]
  });
  const [activeTab, setActiveTab] = useState<'reviews' | 'shares' | 'posts'>('reviews');

  useEffect(() => {
    fetchReviews();
    fetchShares();
    fetchProducts();
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          customer:customers(name),
          product:products(name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchShares = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('social_shares')
        .select(`
          *,
          product:products(name, price, image_url)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, description, image_url, stock_quantity')
        .eq('owner_id', user.id)
        .gt('stock_quantity', 0);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const shareToSocialMedia = async (productId: string, platform: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Generate social media post content
      const content = generatePostContent(product, platform);
      const shareUrl = `${window.location.origin}/product/${productId}`;

      // Save share record
      const { error } = await supabase
        .from('social_shares')
        .insert({
          product_id: productId,
          owner_id: user?.id,
          platform,
          share_url: shareUrl,
          click_count: 0,
          conversion_count: 0
        });

      if (error) throw error;

      // Open social media platform with pre-filled content
      const socialUrl = getSocialMediaUrl(platform, content, shareUrl);
      window.open(socialUrl, '_blank');

      toast({
        title: 'Umegawanya kwenye Mitandao ya Kijamii',
        description: `${product.name} imegawanywa kwenye ${platform}`,
      });

      fetchShares();
    } catch (error) {
      console.error('Error sharing to social media:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kugawanya kwenye mitandao ya kijamii',
        variant: 'destructive'
      });
    }
  };

  const generatePostContent = (product: any, platform: string): string => {
    const baseContent = `🛍️ ${product.name}\n💰 Bei: TZS ${product.price.toLocaleString()}\n\n${product.description || 'Bidhaa nzuri sana!'}\n\n`;
    
    const hashtags = {
      instagram: '#biashara #maduka #ununuzi #Tanzania #KidukaPOS #kusibishaonline #bidhaa',
      facebook: '#biashara #maduka #ununuzi #Tanzania',
      tiktok: '#biashara #maduka #ununuzi #Tanzania #KidukaPOS #viral #trend',
      whatsapp: '',
      twitter: '#biashara #maduka #ununuzi #Tanzania #KidukaPOS'
    };

    return baseContent + (hashtags[platform as keyof typeof hashtags] || '');
  };

  const getSocialMediaUrl = (platform: string, content: string, url: string): string => {
    const encodedContent = encodeURIComponent(content);
    const encodedUrl = encodeURIComponent(url);

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedContent}`;
      case 'instagram':
        // Instagram doesn't support direct sharing with content, so we'll copy to clipboard
        navigator.clipboard.writeText(content + '\n' + url);
        toast({
          title: 'Nakala Imenakiliwa',
          description: 'Bandika kwenye Instagram app',
        });
        return 'https://www.instagram.com/';
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedContent}&url=${encodedUrl}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedContent}${encodedUrl}`;
      case 'tiktok':
        navigator.clipboard.writeText(content);
        toast({
          title: 'Nakala Imenakiliwa',
          description: 'Bandika kwenye TikTok app',
        });
        return 'https://www.tiktok.com/';
      default:
        return '#';
    }
  };

  const createSocialPost = async () => {
    if (!newPost.content || newPost.selectedProducts.length === 0) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza maudhui na chagua bidhaa',
        variant: 'destructive'
      });
      return;
    }

    try {
      for (const productId of newPost.selectedProducts) {
        await shareToSocialMedia(productId, newPost.platform);
      }

      setNewPost({
        content: '',
        platform: 'instagram',
        hashtags: '',
        selectedProducts: []
      });

      toast({
        title: 'Machapisho Yametengenezwa',
        description: 'Machapisho yamegawanywa kwenye mitandao ya kijamii',
      });
    } catch (error) {
      console.error('Error creating social posts:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'tiktok': return <Video className="h-4 w-4" />;
      case 'twitter': return <Hash className="h-4 w-4" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'text-pink-500';
      case 'facebook': return 'text-blue-500';
      case 'whatsapp': return 'text-green-500';
      case 'tiktok': return 'text-black';
      case 'twitter': return 'text-blue-400';
      default: return 'text-gray-500';
    }
  };

  const generateQuickPost = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const quickPosts = [
      `🔥 DEAL YA LEO! ${product.name} kwa bei ya TZS ${product.price.toLocaleString()} tu! \n\n#unadhau #deals #maduka`,
      `✨ BIDHAA MPYA! ${product.name} sasa inapatikana dukani! \n\n#bidhaa_mpya #quality #Tanzania`,
      `🏃‍♂️ HARAKA KABLA HAIJAISHA! ${product.name} - bei ya TZS ${product.price.toLocaleString()}\n\n#limited_stock #opportunity`,
      `💎 QUALITY GUARANTEED! ${product.name} - bidhaa ya hali ya juu\n\n#quality #trust #maduka`
    ];

    const randomPost = quickPosts[Math.floor(Math.random() * quickPosts.length)];
    setNewPost({
      ...newPost,
      content: randomPost,
      selectedProducts: [productId]
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Biashara ya Kijamii</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Vitu vilivyogawanywa</p>
                  <p className="text-xl font-bold">{shares.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Miwonekano</p>
                  <p className="text-xl font-bold">
                    {shares.reduce((sum, share) => sum + share.click_count, 0)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Maoni</p>
                  <p className="text-xl font-bold">{reviews.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Kugeuza</p>
                  <p className="text-xl font-bold">
                    {shares.reduce((sum, share) => sum + share.conversion_count, 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'reviews' ? 'default' : 'outline'}
          onClick={() => setActiveTab('reviews')}
        >
          <Star className="h-4 w-4 mr-2" />
          Maoni
        </Button>
        <Button
          variant={activeTab === 'shares' ? 'default' : 'outline'}
          onClick={() => setActiveTab('shares')}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Mgawanyo
        </Button>
        <Button
          variant={activeTab === 'posts' ? 'default' : 'outline'}
          onClick={() => setActiveTab('posts')}
        >
          <Camera className="h-4 w-4 mr-2" />
          Machapisho
        </Button>
      </div>

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <Card>
          <CardHeader>
            <CardTitle>Maoni ya Wateja</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Hakuna maoni ya wateja bado</p>
                <p className="text-sm text-gray-500">Wateja wako wataanza kutoa maoni baada ya kununua bidhaa</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{review.customer?.name || 'Mteja'}</h4>
                        <p className="text-sm text-gray-600">{review.product?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {renderStars(review.rating)}
                        </div>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-green-600">
                            Umenunua
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {review.review_text && (
                      <p className="text-sm text-gray-700 mb-2">{review.review_text}</p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shares Tab */}
      {activeTab === 'shares' && (
        <Card>
          <CardHeader>
            <CardTitle>Mgawanyo wa Mitandao ya Kijamii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {products.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{product.name}</h4>
                      <p className="text-sm text-gray-600">TZS {product.price.toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateQuickPost(product.id)}
                    >
                      Chapisho la Haraka
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareToSocialMedia(product.id, 'instagram')}
                      className="flex items-center justify-center p-2"
                    >
                      <Instagram className="h-4 w-4 text-pink-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareToSocialMedia(product.id, 'facebook')}
                      className="flex items-center justify-center p-2"
                    >
                      <Facebook className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareToSocialMedia(product.id, 'whatsapp')}
                      className="flex items-center justify-center p-2"
                    >
                      <MessageSquare className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Share History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Historia ya Mgawanyo</h3>
              {shares.map((share) => (
                <Card key={share.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className={getPlatformColor(share.platform)}>
                        {getPlatformIcon(share.platform)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{share.product?.name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(share.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="flex space-x-4">
                        <div>
                          <p className="font-semibold">{share.click_count}</p>
                          <p className="text-gray-600">Miwonekano</p>
                        </div>
                        <div>
                          <p className="font-semibold">{share.conversion_count}</p>
                          <p className="text-gray-600">Kugeuza</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <Card>
          <CardHeader>
            <CardTitle>Tengeneza Chapisho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Jukwaa</label>
              <select
                className="w-full border rounded p-2 mt-1"
                value={newPost.platform}
                onChange={(e) => setNewPost({...newPost, platform: e.target.value})}
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Maudhui ya Chapisho</label>
              <Textarea
                placeholder="Andika maudhui ya chapisho lako..."
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Hashtags</label>
              <Input
                placeholder="#biashara #maduka #ununuzi #Tanzania"
                value={newPost.hashtags}
                onChange={(e) => setNewPost({...newPost, hashtags: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Chagua Bidhaa</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded p-2 cursor-pointer ${
                      newPost.selectedProducts.includes(product.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => {
                      const selected = newPost.selectedProducts.includes(product.id)
                        ? newPost.selectedProducts.filter(id => id !== product.id)
                        : [...newPost.selectedProducts, product.id];
                      setNewPost({...newPost, selectedProducts: selected});
                    }}
                  >
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-600">TZS {product.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={createSocialPost} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Gawanya Chapisho
            </Button>

            {/* Quick Templates */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Mifano ya Haraka</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPost({
                    ...newPost,
                    content: '🔥 DEAL YA LEO! Bei za makusudi kwa bidhaa zetu nzuri!\n\n#unadhau #deals #maduka #Tanzania'
                  })}
                >
                  Deal ya Leo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPost({
                    ...newPost,
                    content: '✨ BIDHAA MPYA! Tumepata bidhaa mpya za hali ya juu!\n\n#bidhaa_mpya #quality #Tanzania'
                  })}
                >
                  Bidhaa Mpya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPost({
                    ...newPost,
                    content: '🙏 ASANTE WATEJA WETU! Tunapenda huduma zetu za kila siku!\n\n#asante #wateja #huduma'
                  })}
                >
                  Shukrani
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPost({
                    ...newPost,
                    content: '📢 TANGAZO! Tunatafuta washirika wa biashara na wateja wapya!\n\n#tangazo #washirika #biashara'
                  })}
                >
                  Tangazo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
