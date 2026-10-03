import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { adminClient, harakaFetch, ownerAmountDue, verifyAndApply } from '../_shared/harakapay.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('initiate'),
    transaction_type: z.enum(['subscription_payment', 'order_payment']),
    phone_number: z.string().regex(/^\+?[0-9 ]{9,15}$/),
    order_id: z.string().uuid().optional().nullable(),
  }),
  z.object({ action: z.literal('status'), transaction_id: z.string().uuid() }),
]);

function normalizePhone(raw: string) {
  let p = raw.replace(/\D/g, '');
  if (p.startsWith('255') && p.length === 12) p = `0${p.slice(3)}`;
  else if (p.length === 9) p = `0${p}`;
  return p; // HarakaPay expects local format, e.g. 0712345678
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const raw = await req.json().catch(() => ({}));
    // Backwards compatible: old callers send no action.
    const parsed = Body.safeParse({ action: 'initiate', ...raw });
    if (!parsed.success) return json({ success: false, error: 'Taarifa za malipo si sahihi' }, 400);
    const body = parsed.data;
    const admin = adminClient();

    if (body.action === 'status') {
      const { data: tx } = await admin.from('payment_transactions').select('*').eq('id', body.transaction_id).eq('user_id', user.id).maybeSingle();
      if (!tx) return json({ success: false, error: 'Muamala haujapatikana' }, 404);
      const result = await verifyAndApply(admin, tx);
      return json({ success: true, ...result, amount: tx.amount });
    }

    let amount = 0;
    let subscriptionId: string | null = null;
    let orderId: string | null = null;
    let description = 'Ada ya mwezi ya Kiduka';
    if (body.transaction_type === 'subscription_payment') {
      const due = await ownerAmountDue(admin, user.id);
      amount = due.amount; subscriptionId = due.subscriptionId;
    } else {
      if (!body.order_id) return json({ success: false, error: 'Oda haijatajwa' }, 400);
      const { data: order } = await admin.from('sokoni_orders').select('id,total_amount').eq('id', body.order_id).maybeSingle();
      if (!order) return json({ success: false, error: 'Oda haijapatikana' }, 404);
      amount = Number(order.total_amount || 0); orderId = order.id;
      description = `Oda ya Sokoni #${order.id.slice(0, 8)}`;
    }
    if (!Number.isFinite(amount) || amount < 100) return json({ success: false, error: 'Kiasi cha kulipa si sahihi (kiwango cha chini TSh 100)' }, 400);

    const phone = normalizePhone(body.phone_number);
    if (!/^0[67][0-9]{8}$/.test(phone)) return json({ success: false, error: 'Namba ya simu si sahihi' }, 400);

    const { data: tx, error: txError } = await admin.from('payment_transactions').insert({
      user_id: user.id, order_id: orderId, subscription_id: subscriptionId,
      transaction_type: body.transaction_type, amount, currency: 'TZS', phone_number: phone,
      payment_method: 'mobile_money', status: 'pending', provider: 'harakapay',
    }).select('*').single();
    if (txError || !tx) throw txError || new Error('Muamala haukuhifadhiwa');

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/harakapay-webhook`;
    const { ok, data } = await harakaFetch('/collect', { method: 'POST', body: JSON.stringify({ phone, amount, description, webhook_url: webhookUrl }) });
    if (!ok || !data?.success || !data?.order_id) {
      await admin.from('payment_transactions').update({ status: 'failed', metadata: { initiation: data } }).eq('id', tx.id);
      return json({ success: false, error: data?.error || data?.message || 'HarakaPay imeshindwa kutuma ombi la malipo' }, 400);
    }
    await admin.from('payment_transactions').update({
      status: 'processing', provider_reference: data.order_id,
      metadata: { initiation: { order_id: data.order_id, amount: data.amount, fee: data.fee, net_amount: data.net_amount } },
      updated_at: new Date().toISOString(),
    }).eq('id', tx.id);
    return json({ success: true, transaction_id: tx.id, reference: data.order_id, amount });
  } catch (error) {
    console.error('harakapay-payment', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Tatizo la malipo' }, 500);
  }
});
