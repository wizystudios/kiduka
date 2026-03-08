import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderReviewFormProps {
  orderId: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number; product_id?: string }>;
  customerPhone: string;
}

export const OrderReviewForm = ({ orderId, items, customerPhone }: OrderReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Tafadhali chagua rating');
      return;
    }

    setSubmitting(true);
    try {
      // Submit review for each product that has a product_id
      for (const item of items) {
        if (item.product_id) {
          await supabase.from('product_reviews').insert({
            product_id: item.product_id,
            customer_phone: customerPhone,
            customer_name: customerName || null,
            rating,
            review_text: reviewText || null,
            is_verified_purchase: true,
          });
        }
      }
      
      toast.success('Asante kwa maoni yako!');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Imeshindwa kutuma maoni. Jaribu tena.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="p-3 text-center">
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-1 fill-current" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Asante kwa maoni yako!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500" />
          Acha Maoni ya Bidhaa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star className={`h-6 w-6 transition-colors ${
                star <= rating ? 'text-yellow-500 fill-current' : 'text-muted-foreground'
              }`} />
            </button>
          ))}
        </div>
        <Input
          placeholder="Jina lako (si lazima)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="text-xs h-8"
        />
        <Input
          placeholder="Maoni yako kuhusu bidhaa..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="text-xs h-8"
        />
        <Button
          size="sm"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
        >
          <Send className="h-3 w-3 mr-1" />
          {submitting ? 'Inatuma...' : 'Tuma Maoni'}
        </Button>
      </CardContent>
    </Card>
  );
};
