import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find abandoned carts older than 1 hour that haven't been reminded
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: carts, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('reminder_sent', false)
      .eq('recovered', false)
      .lt('created_at', oneHourAgo)
      .limit(50);

    if (error) throw error;
    if (!carts || carts.length === 0) {
      return new Response(JSON.stringify({ message: 'No abandoned carts to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    for (const cart of carts) {
      const items = Array.isArray(cart.items) ? cart.items : [];
      const itemNames = items.map((i: any) => i.product_name).join(', ');
      
      const message = `🛒 *Umesahau Kikapu Chako!*\n\nUna bidhaa kwenye kikapu chako:\n${itemNames}\n\nJumla: TSh ${cart.total_amount?.toLocaleString() || '0'}\n\n📲 Kamilisha oda yako sasa kwenye Sokoni!\n\nhttps://kiduka.lovable.app/sokoni`;

      try {
        // Try WhatsApp first
        const whatsappResp = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            phone: cart.customer_phone,
            message,
          }),
        });

        if (!whatsappResp.ok) {
          // Fallback to SMS
          const smsMsg = `Umesahau kikapu chako! ${itemNames} - TSh ${cart.total_amount?.toLocaleString()}. Kamilisha oda: kiduka.lovable.app/sokoni`;
          await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              phone: cart.customer_phone,
              message: smsMsg,
            }),
          });
        }

        // Mark as sent
        await supabase
          .from('abandoned_carts')
          .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
          .eq('id', cart.id);
        
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder for cart ${cart.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${sent} abandoned cart reminders` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing abandoned carts:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
