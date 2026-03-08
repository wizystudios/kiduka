
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get pending scheduled messages that are due
    const { data: messages, error: fetchError } = await supabase
      .from('scheduled_whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50)

    if (fetchError) throw fetchError

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No scheduled messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0

    for (const msg of messages) {
      try {
        // Try sending via the send-whatsapp function
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            phoneNumber: msg.phone_number,
            message: msg.message,
            messageType: msg.message_type
          }
        })

        if (error) throw error

        // Mark as sent
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id)

        // Log to whatsapp_messages history
        await supabase
          .from('whatsapp_messages')
          .insert({
            owner_id: msg.owner_id,
            customer_id: msg.customer_id,
            customer_name: msg.customer_name,
            phone_number: msg.phone_number,
            message: msg.message,
            message_type: msg.message_type,
            status: 'sent'
          })

        sent++
      } catch (err) {
        // Mark as failed
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({ 
            status: 'failed', 
            error_message: err instanceof Error ? err.message : 'Unknown error' 
          })
          .eq('id', msg.id)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ processed: messages.length, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing scheduled messages:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
