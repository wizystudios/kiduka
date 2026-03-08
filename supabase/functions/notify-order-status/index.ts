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

    const message = STATUS_MESSAGES[new_status] || `Hali ya oda yako imebadilika kuwa: ${new_status}`;
    const fullMessage = `Habari! ${message}\n\n📋 Tracking: ${tracking_code || 'N/A'}\n\n🔗 Fuatilia oda yako: https://kiduka.lovable.app/track-order?code=${tracking_code}`;

    // Send WhatsApp notification using existing send-whatsapp function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to send via WhatsApp
    try {
      const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          phone: customer_phone,
          message: fullMessage,
        }),
      });
      
      console.log('WhatsApp notification sent:', whatsappResponse.status);
    } catch (whatsappError) {
      console.error('WhatsApp send failed:', whatsappError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Notification sent for status change: ${old_status} → ${new_status}` 
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
