import { supabase } from '@/integrations/supabase/client';
import { paymentAmountError } from './paymentValidation';

export async function settleCustomerDebt(customerId: string, amount: number, transactionId?: string, requestId = crypto.randomUUID()) {
  const invalid = paymentAmountError(amount, Number.MAX_VALUE);
  if (invalid) throw new Error(invalid);
  const { data, error } = await supabase.rpc('settle_customer_debt', {
    p_customer_id: customerId, p_amount: amount, p_request_id: requestId,
    p_transaction_id: transactionId, p_method: 'cash',
  });
  if (error) throw error;
  window.dispatchEvent(new Event('kiduka:trade-updated'));
  return data;
}