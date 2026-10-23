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
      const phone = localStorage.getItem('sokoni_customer_phone');
      const pin = localStorage.getItem('sokoni_customer_pin');
      if (!phone || !pin || phone !== customerPhone) throw new Error('Ingia kwenye akaunti yako ya Sokoni kwanza.');
      if (!items.some(item => item.product_id)) throw new Error('Bidhaa za oda hii hazijapatikana.');
      for (const item of items) {
        if (item.product_id) {
          const { data, error } = await supabase.rpc('submit_verified_order_review', {
            p_order_id: orderId,
            p_product_id: item.product_id,
            p_phone: phone,
            p_pin: pin,
            p_customer_name: customerName || null,
            p_rating: rating,
            p_review_text: reviewText || null,
          });
          if (error || !(data as any)?.success) throw new Error('Ununuzi haujathibitishwa au maoni tayari yametumwa.');
        }
      }
      
      toast.success('Asante kwa maoni yako!');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Imeshindwa kutuma maoni. Jaribu tena.');
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
