import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    console.log('ClickPesa webhook received:', JSON.stringify(body));

    const { reference, status, transaction_id, amount } = body;

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find transaction by reference (format: KDK-XXXXXXXX)
    const txId = reference.replace('KDK-', '').toLowerCase();
    
    const { data: transactions, error: findError } = await supabase
      .from('payment_transactions')
      .select('*')
      .ilike('id', `${txId}%`);

    if (findError || !transactions || transactions.length === 0) {
      console.error('Transaction not found:', reference, findError);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = transactions[0];
    const newStatus = status === 'success' || status === 'completed' ? 'completed' : 
                      status === 'failed' ? 'failed' : 'processing';

    // Update transaction status
    await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        provider_reference: transaction_id,
        metadata: { ...transaction.metadata, webhook_data: body },
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    // If payment successful, update related records
    if (newStatus === 'completed') {
      // Handle order payment
      if (transaction.order_id) {
        await supabase
          .from('sokoni_orders')
          .update({
            payment_status: 'paid',
            customer_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.order_id);

        // Notify seller
        const { data: order } = await supabase
          .from('sokoni_orders')
          .select('seller_id, tracking_code, total_amount')
          .eq('id', transaction.order_id)
          .single();

        if (order) {
          await supabase.from('admin_notifications').insert({
            notification_type: 'payment_received',
            title: 'Malipo Yamepokelewa',
            message: `Oda ${order.tracking_code} imelipwa TSh ${order.total_amount?.toLocaleString()}`,
            data: { order_id: transaction.order_id, amount: order.total_amount }
          });
        }
      }

      // Handle subscription payment
      if (transaction.subscription_id) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_amount: transaction.amount,
            payment_reference: reference,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.subscription_id);

        await supabase.from('admin_notifications').insert({
          notification_type: 'payment_received',
          title: 'Malipo ya Usajili',
          message: `Usajili umelipwa TSh ${transaction.amount?.toLocaleString()}`,
          data: { subscription_id: transaction.subscription_id, amount: transaction.amount }
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
