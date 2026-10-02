import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const clientId = Deno.env.get('CLICKPESA_CLIENT_ID');
    const apiKey = Deno.env.get('CLICKPESA_API_KEY');
    if (!url || !serviceKey || !anonKey || !clientId || !apiKey) return json({ success: false, error: 'Malipo hayajaunganishwa kikamilifu' }, 503);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Unauthorized' }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json();
    const transactionType = body?.transaction_type;
    const phoneRaw = String(body?.phone_number || '');
    if (!['subscription_payment', 'order_payment'].includes(transactionType) || !/^\+?[0-9 ]{9,15}$/.test(phoneRaw)) {
      return json({ success: false, error: 'Taarifa za malipo si sahihi' }, 400);
    }
    if (body?.user_id && body.user_id !== user.id) return json({ success: false, error: 'user_id mismatch' }, 403);

    const admin = createClient(url, serviceKey);
    let amount = 0;
    let subscriptionId: string | null = null;
    let orderId: string | null = null;
    if (transactionType === 'subscription_payment') {
      const { data: bill, error: billError } = await admin.rpc('compute_business_billing', { p_owner_id: user.id });
      if (billError) throw billError;
      amount = Number(bill?.amount_due ?? bill?.total ?? 0);
      const { data: subscription } = await admin.from('user_subscriptions').select('id').eq('user_id', user.id).single();
      subscriptionId = subscription?.id || null;
    } else {
      orderId = String(body?.order_id || '');
      const { data: order } = await admin.from('sokoni_orders').select('id,total_amount,customer_id').eq('id', orderId).single();
      if (!order) return json({ success: false, error: 'Oda haijapatikana' }, 404);
      amount = Number(order.total_amount || 0);
    }
    if (!Number.isFinite(amount) || amount <= 0) return json({ success: false, error: 'Kiasi cha bili hakijapatikana' }, 400);

    let phone = phoneRaw.replace(/\D/g, '');
    if (phone.startsWith('0') && phone.length === 10) phone = `255${phone.slice(1)}`;
    else if (phone.length === 9) phone = `255${phone}`;

    const { data: tx, error: txError } = await admin.from('payment_transactions').insert({
      user_id: user.id, order_id: orderId, subscription_id: subscriptionId,
      transaction_type: transactionType, amount, phone_number: phone,
      payment_method: 'mobile_money', status: 'pending', provider: 'clickpesa'
    }).select('id').single();
    if (txError || !tx) throw txError || new Error('Muamala haukuhifadhiwa');
    const reference = `KDK-${tx.id.toUpperCase()}`;

    const tokenResponse = await fetch('https://api.clickpesa.com/third-parties/generate-token', {
      method: 'POST', headers: { 'client-id': clientId, 'api-key': apiKey }
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData?.token) throw new Error('ClickPesa haikutoa ruhusa ya malipo');

    const providerResponse = await fetch('https://api.clickpesa.com/third-parties/payments/initiate-ussd-push-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenData.token}` },
      body: JSON.stringify({ amount: String(amount), currency: 'TZS', orderReference: reference, phoneNumber: phone })
    });
    const providerData = await providerResponse.json();
    if (!providerResponse.ok) {
      await admin.from('payment_transactions').update({ status: 'failed', metadata: { initiation: providerData } }).eq('id', tx.id);
      return json({ success: false, error: providerData?.message || 'ClickPesa imeshindwa kuanzisha malipo' }, 400);
    }
    await admin.from('payment_transactions').update({ status: 'processing', provider_reference: reference, metadata: { initiation: providerData }, updated_at: new Date().toISOString() }).eq('id', tx.id);
    return json({ success: true, transaction_id: tx.id, reference, amount });
  } catch (error) {
    console.error('clickpesa-payment', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Tatizo la malipo' }, 500);
  }
});