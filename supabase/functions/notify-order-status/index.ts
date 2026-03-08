import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: '✅ Oda yako imethibitishwa na inaandaliwa!',
  preparing: '📦 Oda yako inaandaliwa sasa.',
  ready: '🎉 Oda yako iko tayari kusafirishwa!',
  shipped: '🚚 Oda yako inasafirishwa sasa! Itafika hivi karibuni.',
  delivered: '✅ Oda yako imefika! Tafadhali thibitisha upokeaji.',
  cancelled: '❌ Oda yako imeghairiwa.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, old_status, new_status, tracking_code, customer_phone } = await req.json();

    if (!order_id || !new_status || !customer_phone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const message = STATUS_MESSAGES[new_status] || `Hali ya oda yako imebadilika kuwa: ${new_status}`;
    const trackingLink = `https://kiduka.lovable.app/track-order?code=${tracking_code}`;
    const fullMessage = `Habari! ${message}\n\n📋 Tracking: ${tracking_code || 'N/A'}\n\n🔗 Fuatilia oda yako: ${trackingLink}`;
    
    // Shorter SMS version (to save cost)
    const smsMessage = `${message} Tracking: ${tracking_code || 'N/A'}. Fuatilia: ${trackingLink}`;

    let whatsappSent = false;

    // 1. Try WhatsApp first
    try {
      const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          phoneNumber: customer_phone,
          message: fullMessage,
        }),
      });
      
      const waBody = await whatsappResponse.text();
      console.log('WhatsApp response:', whatsappResponse.status, waBody);
      
      if (whatsappResponse.ok) {
        whatsappSent = true;
      }
    } catch (whatsappError) {
      console.error('WhatsApp send failed:', whatsappError);
    }

    // 2. If WhatsApp failed, try SMS as backup
    let smsSent = false;
    if (!whatsappSent) {
      console.log('WhatsApp failed, attempting SMS backup...');
      try {
        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            phoneNumber: customer_phone,
            message: smsMessage,
            transactionId: `order-status-${order_id}-${new_status}`,
          }),
        });

        const smsBody = await smsResponse.text();
        console.log('SMS response:', smsResponse.status, smsBody);

        if (smsResponse.ok) {
          smsSent = true;
        }
      } catch (smsError) {
        console.error('SMS backup also failed:', smsError);
      }
    }

    const method = whatsappSent ? 'whatsapp' : smsSent ? 'sms' : 'none';
    console.log(`Notification result: ${method} for ${old_status} → ${new_status}`);

    return new Response(JSON.stringify({ 
      success: whatsappSent || smsSent,
      method,
      message: `Notification via ${method} for status change: ${old_status} → ${new_status}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
