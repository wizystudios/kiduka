import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('CLICKPESA_CLIENT_ID');
    const apiKey = Deno.env.get('CLICKPESA_API_KEY');
    if (!url || !key || !clientId || !apiKey) return json({ success: false }, 503);
    const body = await req.json();
    const reference = String(body?.orderReference || body?.reference || '');
    if (!reference.startsWith('KDK-')) return json({ success: false, error: 'Invalid reference' }, 400);

    const admin = createClient(url, key);
    const { data: tx } = await admin.from('payment_transactions').select('*').eq('provider_reference', reference).single();
    if (!tx) return json({ success: false, error: 'Transaction not found' }, 404);
    if (tx.status === 'completed') return json({ success: true, status: 'completed' });

    const tokenResponse = await fetch('https://api.clickpesa.com/third-parties/generate-token', { method: 'POST', headers: { 'client-id': clientId, 'api-key': apiKey } });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData?.token) return json({ success: false, error: 'Provider verification unavailable' }, 503);
    const verifyResponse = await fetch(`https://api.clickpesa.com/third-parties/payments/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${tokenData.token}` } });
    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok) return json({ success: false, error: 'Provider verification failed' }, 502);
    const payment = Array.isArray(verifyData) ? verifyData[0] : verifyData;
    const providerStatus = String(payment?.status || '').toUpperCase();
    const paidAmount = Number(payment?.amount ?? payment?.collectedAmount ?? 0);
    const completed = ['SUCCESS', 'SETTLED'].includes(providerStatus);
    const exactAmount = paidAmount === Number(tx.amount);
    const status = completed && exactAmount ? 'completed' : providerStatus === 'FAILED' ? 'failed' : 'processing';

    await admin.from('payment_transactions').update({ status, paid_amount: paidAmount || null, confirmed_at: status === 'completed' ? new Date().toISOString() : null, metadata: { ...tx.metadata, callback: body, verification: payment }, updated_at: new Date().toISOString() }).eq('id', tx.id);
    if (completed && !exactAmount) {
      await admin.from('admin_notifications').insert({ notification_type: 'payment_amount_mismatch', title: 'Kiasi cha Malipo Hakilingani', message: `Ilitarajiwa TSh ${Number(tx.amount).toLocaleString()}, imepokelewa TSh ${paidAmount.toLocaleString()}`, data: { transaction_id: tx.id } });
      return json({ success: false, error: 'Amount mismatch' }, 409);
    }
    if (status !== 'completed') return json({ success: true, status });

    if (tx.subscription_id) {
      const { data: bill } = await admin.rpc('compute_business_billing', { p_owner_id: tx.user_id });
      if (Number(bill?.amount_due ?? bill?.total ?? 0) !== Number(tx.amount)) return json({ success: false, error: 'Bill changed' }, 409);
      const end = new Date(); end.setMonth(end.getMonth() + 1);
      await admin.from('user_subscriptions').update({ status: 'active', current_period_start: new Date().toISOString(), current_period_end: end.toISOString(), calculated_fee: tx.amount, payment_amount: paidAmount, payment_reference: reference, fee_breakdown: bill, updated_at: new Date().toISOString() }).eq('id', tx.subscription_id);
    }
    if (tx.order_id) await admin.from('sokoni_orders').update({ payment_status: 'paid', customer_paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', tx.order_id);
    await admin.from('admin_notifications').insert({ notification_type: 'payment_received', title: 'Malipo Yamethibitishwa', message: `ClickPesa imethibitisha TSh ${paidAmount.toLocaleString()}`, data: { transaction_id: tx.id, reference } });
    return json({ success: true, status: 'completed' });
  } catch (error) {
    console.error('clickpesa-webhook', error);
    return json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});