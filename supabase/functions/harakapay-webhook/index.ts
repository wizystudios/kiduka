import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminClient, verifyAndApply } from '../_shared/harakapay.ts';

// Public callback. The body is never trusted: we only use order_id to look up our
// transaction, then re-check the status directly with HarakaPay before applying it.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || '');
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(orderId)) return json({ success: false }, 400);
    const admin = adminClient();
    const { data: tx } = await admin.from('payment_transactions').select('*').eq('provider_reference', orderId).eq('provider', 'harakapay').maybeSingle();
    if (!tx) return json({ success: false }, 404);
    const result = await verifyAndApply(admin, tx);
    return json({ success: true, status: result.status });
  } catch (error) {
    console.error('harakapay-webhook', error);
    return json({ success: false }, 500);
  }
});
