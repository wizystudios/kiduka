import { supabase } from '@/integrations/supabase/client';

export function paymentAmountError(amount: number, balance: number) {
  return !Number.isFinite(amount) || amount <= 0 || amount > balance ? 'Kiasi lazima kiwe zaidi ya sifuri na kisizidi deni.' : null;
}

export async function settleCustomerDebt(customerId: string, amount: number, transactionId?: string, requestId = crypto.randomUUID()) {
  const { data, error } = await supabase.rpc('settle_customer_debt', {
    p_customer_id: customerId, p_amount: amount, p_request_id: requestId,
    p_transaction_id: transactionId, p_method: 'cash',
  });
  if (error) throw error;
  window.dispatchEvent(new Event('kiduka:trade-updated'));
  return data;
}