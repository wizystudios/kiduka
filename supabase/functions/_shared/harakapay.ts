// Shared HarakaPay helpers: provider calls + server-side confirmation and activation.
// Payments are only marked completed after HarakaPay's own status endpoint reports
// "completed" for the exact amount we charged.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const HARAKAPAY_BASE = 'https://harakapay.net/api/v1';

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

export async function harakaFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get('HARAKAPAY_API_KEY');
  if (!apiKey) throw new Error('HarakaPay haijaunganishwa');
  const res = await fetch(`${HARAKAPAY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
  return { ok: res.ok, status: res.status, data };
}

/** Amount the owner owes, from the database bill (custom fee wins, like get_my_billing). */
export async function ownerAmountDue(admin: SupabaseClient, ownerId: string) {
  const { data: bill, error } = await admin.rpc('compute_business_billing', { p_owner_id: ownerId });
  if (error) throw error;
  const { data: sub } = await admin.from('user_subscriptions').select('id,custom_fee').eq('user_id', ownerId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  const amount = Number(sub?.custom_fee ?? (bill as any)?.total ?? 0);
  return { amount, bill, subscriptionId: sub?.id ?? null };
}

/** Ask HarakaPay for the real status of a transaction and apply it. Idempotent. */
export async function verifyAndApply(admin: SupabaseClient, tx: any) {
  if (tx.status === 'completed') return { status: 'completed' };
  if (!tx.provider_reference) return { status: tx.status };

  const { ok, data } = await harakaFetch(`/status/${encodeURIComponent(tx.provider_reference)}`);
  if (!ok || !data?.success || !data?.payment) return { status: tx.status, error: 'Uthibitisho haupatikani kwa sasa' };
  const payment = data.payment;
  const providerStatus = String(payment.status || '').toLowerCase();
  const paidAmount = Number(payment.amount ?? 0);
  const exact = paidAmount === Number(tx.amount);
  const now = new Date().toISOString();

  if (providerStatus === 'failed' || providerStatus === 'cancelled') {
    await admin.from('payment_transactions').update({ status: 'failed', metadata: { ...(tx.metadata || {}), verification: payment }, updated_at: now }).eq('id', tx.id);
    return { status: 'failed' };
  }
  if (providerStatus !== 'completed') return { status: 'processing' };

  if (!exact) {
    await admin.from('payment_transactions').update({ status: 'amount_mismatch', paid_amount: paidAmount, metadata: { ...(tx.metadata || {}), verification: payment }, updated_at: now }).eq('id', tx.id);
    await admin.from('admin_notifications').insert({ notification_type: 'payment_amount_mismatch', title: 'Kiasi cha Malipo Hakilingani', message: `Ilitarajiwa TSh ${Number(tx.amount).toLocaleString()}, imepokelewa TSh ${paidAmount.toLocaleString()}`, data: { transaction_id: tx.id } });
    return { status: 'amount_mismatch' };
  }

  // Claim the transaction atomically so webhook + polling cannot activate twice.
  const { data: claimed } = await admin.from('payment_transactions')
    .update({ status: 'completed', paid_amount: paidAmount, confirmed_at: now, metadata: { ...(tx.metadata || {}), verification: payment }, updated_at: now })
    .eq('id', tx.id).neq('status', 'completed').select('id');
  if (!claimed || claimed.length === 0) return { status: 'completed' };

  if (tx.subscription_id) {
    const { data: bill } = await admin.rpc('compute_business_billing', { p_owner_id: tx.user_id });
    const start = new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + 1);
    await admin.from('user_subscriptions').update({
      status: 'active',
      current_period_start: start.toISOString(), current_period_end: end.toISOString(),
      calculated_fee: tx.amount, payment_amount: paidAmount, payment_reference: tx.provider_reference,
      fee_breakdown: bill, updated_at: now,
    }).eq('id', tx.subscription_id);
  }
  if (tx.order_id) {
    await admin.from('sokoni_orders').update({ payment_status: 'paid', customer_paid_at: now, updated_at: now }).eq('id', tx.order_id);
  }
  await admin.from('admin_notifications').insert({ notification_type: 'payment_received', title: 'Malipo Yamethibitishwa', message: `HarakaPay imethibitisha TSh ${paidAmount.toLocaleString()}`, data: { transaction_id: tx.id, reference: tx.provider_reference } });
  return { status: 'completed' };
}
