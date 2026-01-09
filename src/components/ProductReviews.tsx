import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Star, MessageSquare, User, CheckCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!customerPhone || customerPhone.length < 9) {
      toast.error('Weka namba ya simu sahihi');
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error('Chagua rating kati ya 1-5');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          customer_phone: customerPhone,
          customer_name: customerName || null,
          rating,
          review_text: reviewText || null,
        });

      if (error) throw error;

      toast.success('Asante kwa maoni yako!');
      setShowAddReview(false);
      setRating(5);
      setReviewText('');
      setCustomerName('');
      setCustomerPhone('');
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Imeshindwa kutuma maoni. Jaribu tena.');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 
      : 0
  }));

  const StarRating = ({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };
    
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={onChange ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star
              className={`${sizeClasses[size]} ${
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sw-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 6) return '***';
    return phone.slice(0, 3) + '***' + phone.slice(-3);
  };

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground">{averageRating.toFixed(1)}</div>
          <StarRating value={Math.round(averageRating)} size="sm" />
          <p className="text-xs text-muted-foreground mt-1">{reviews.length} maoni</p>
        </div>
        
        <div className="flex-1 space-y-1">
          {ratingCounts.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3">{star}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-6 text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Review Button */}
      <Dialog open={showAddReview} onOpenChange={setShowAddReview}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <MessageSquare className="h-4 w-4" />
            Andika Maoni
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Andika Maoni ya {productName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex items-center gap-2">
                <StarRating value={rating} onChange={setRating} size="lg" />
                <span className="text-sm text-muted-foreground">({rating}/5)</span>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">Jina lako (hiari)</label>
              <Input
                placeholder="Jina lako"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="text-sm font-medium mb-1 block">Namba ya simu *</label>
              <Input
                placeholder="07xx xxx xxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* Review Text */}
            <div>
              <label className="text-sm font-medium mb-1 block">Maoni yako (hiari)</label>
              <Textarea
                placeholder="Eleza uzoefu wako na bidhaa hii..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              className="w-full gap-2" 
              onClick={submitReview}
              disabled={submitting || !customerPhone || customerPhone.length < 9}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Inatuma...' : 'Tuma Maoni'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Hakuna maoni bado</p>
          <p className="text-xs">Kuwa wa kwanza kutoa maoni!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {reviews.slice(0, 5).map((review) => (
            <Card key={review.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {review.customer_name || maskPhone(review.customer_phone)}
                      </p>
                      <div className="flex items-center gap-1">
                        <StarRating value={review.rating} size="sm" />
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 ml-1">
                            <CheckCircle className="h-2.5 w-2.5" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.review_text}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
