import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLICKPESA_API_URL = 'https://api.clickpesa.com/v2';

interface PaymentRequest {
  amount: number;
  phone_number: string;
  order_id?: string;
  subscription_id?: string;
  transaction_type: 'order_payment' | 'subscription_payment';
  user_id?: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLICKPESA_CLIENT_ID = Deno.env.get('CLICKPESA_CLIENT_ID');
    const CLICKPESA_API_KEY = Deno.env.get('CLICKPESA_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!CLICKPESA_CLIENT_ID || !CLICKPESA_API_KEY) {
      throw new Error('ClickPesa credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: PaymentRequest = await req.json();

    const { amount, phone_number, order_id, subscription_id, transaction_type, user_id, description } = body;

    if (!amount || !phone_number || !transaction_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: amount, phone_number, transaction_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number for Tanzania
    let normalizedPhone = phone_number.replace(/[^0-9]/g, '');
    if (normalizedPhone.startsWith('0') && normalizedPhone.length === 10) {
      normalizedPhone = '255' + normalizedPhone.substring(1);
    } else if (normalizedPhone.length === 9) {
      normalizedPhone = '255' + normalizedPhone;
    }

    // Create payment transaction record first
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id,
        order_id,
        subscription_id,
        transaction_type,
        amount,
        phone_number: normalizedPhone,
        status: 'pending',
        provider: 'clickpesa',
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      throw new Error('Failed to create transaction record');
    }

    // Generate unique reference
    const reference = `KDK-${transaction.id.substring(0, 8).toUpperCase()}`;

    // Make ClickPesa API call
    const clickpesaPayload = {
      amount: amount,
      phone: normalizedPhone,
      reference: reference,
      description: description || `Kiduka Payment - ${transaction_type}`,
      callback_url: `${SUPABASE_URL}/functions/v1/clickpesa-webhook`,
    };

    const clickpesaResponse = await fetch(`${CLICKPESA_API_URL}/payments/mobile-money/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLICKPESA_API_KEY}`,
        'X-Client-Id': CLICKPESA_CLIENT_ID,
      },
      body: JSON.stringify(clickpesaPayload),
    });

    const clickpesaData = await clickpesaResponse.json();

    if (!clickpesaResponse.ok) {
      console.error('ClickPesa API error:', clickpesaData);
      
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ 
          status: 'failed', 
          metadata: { error: clickpesaData },
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: clickpesaData.message || 'Payment initiation failed',
          transaction_id: transaction.id 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction with provider reference
    await supabase
      .from('payment_transactions')
      .update({ 
        status: 'processing',
        provider_reference: clickpesaData.transaction_id || reference,
        metadata: clickpesaData,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initiated. Please complete on your phone.',
        transaction_id: transaction.id,
        reference: reference,
        provider_reference: clickpesaData.transaction_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
