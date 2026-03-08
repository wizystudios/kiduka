import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReturnRequestFormProps {
  orderId: string;
  sellerId: string;
  customerPhone: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number }>;
  totalAmount: number;
}

export const ReturnRequestForm = ({ orderId, sellerId, customerPhone, items, totalAmount }: ReturnRequestFormProps) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasons = [
    'Bidhaa imeharibiwa',
    'Bidhaa si sahihi',
    'Ubora duni',
    'Sikupenda',
    'Nyingine',
  ];

  const handleSubmit = async () => {
    const finalReason = reason === 'Nyingine' ? customReason : reason;
    if (!finalReason) {
      toast.error('Tafadhali chagua sababu');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('return_requests').insert({
        order_id: orderId,
        seller_id: sellerId,
        customer_phone: customerPhone,
        reason: finalReason,
        items,
        refund_amount: totalAmount,
      });

      if (error) throw error;
      toast.success('Ombi la kurudisha bidhaa limetumwa!');
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Imeshindwa kutuma ombi');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-3 text-center">
          <RotateCcw className="h-5 w-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Ombi lako limetumwa. Utajulishwa hali yake.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          Omba Kurudisha Bidhaa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Chagua sababu..." />
          </SelectTrigger>
          <SelectContent>
            {reasons.map(r => (
              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {reason === 'Nyingine' && (
          <Input
            placeholder="Eleza sababu..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="text-xs h-8"
          />
        )}
        <Button size="sm" className="w-full" onClick={handleSubmit} disabled={submitting || !reason}>
          <Send className="h-3 w-3 mr-1" />
          {submitting ? 'Inatuma...' : 'Tuma Ombi'}
        </Button>
      </CardContent>
    </Card>
  );
};
