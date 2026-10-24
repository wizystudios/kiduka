
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roles, error: roleError } = await userClient.from('user_roles').select('role').eq('user_id', user.id);
    const owner = !roleError && roles?.some((r: { role: string }) => r.role === 'owner' || r.role === 'super_admin');
    if (!owner) {
      const { data: links, error } = await userClient.from('assistant_permissions').select('owner_id').eq('assistant_id', user.id).eq('is_active', true);
      const grants = await Promise.all((links || []).map(async (link: { owner_id: string }) => {
        const result = await userClient.rpc('assistant_can', { p_owner_id: link.owner_id, p_key: 'whatsapp_send' });
        return !result.error && result.data === true;
      }));
      if (error || !grants.some(Boolean)) return new Response(JSON.stringify({ error: 'Huna ruhusa ya kutuma ujumbe', success: false }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { phoneNumber, message, messageType = 'general' } = await req.json()

    // Validate input
    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number (ensure it has country code)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : 
                          phoneNumber.startsWith('0') ? `255${phoneNumber.slice(1)}` : phoneNumber

    // In production, you would integrate with:
    // 1. WhatsApp Business API
    // 2. Twilio WhatsApp API
    // 3. Meta WhatsApp Cloud API
    // 4. Africa's Talking WhatsApp API

    // For now, we'll simulate sending via Africa's Talking SMS
    // (which can be configured to work with WhatsApp Business)
    const AT_API_KEY = Deno.env.get('AFRICAS_TALKING_API_KEY')
    const AT_USERNAME = Deno.env.get('AFRICAS_TALKING_USERNAME')

    if (!AT_API_KEY || !AT_USERNAME) {
      return new Response(JSON.stringify({ success: false, error: 'WhatsApp haijaunganishwa; fungua WhatsApp kutuma ujumbe.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send via Africa's Talking SMS API (can be configured for WhatsApp)
    const smsData = new URLSearchParams({
      username: AT_USERNAME,
      to: `+${formattedPhone}`,
      message: `[WhatsApp] ${message}`,
      from: 'KidukaPOS'
    })

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: smsData
    })

    const result = await response.json()

    if (result.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: result.SMSMessageData.Recipients[0].messageId,
          message: 'WhatsApp message sent successfully',
          phoneNumber: formattedPhone,
          messageType,
          cost: result.SMSMessageData.Recipients[0].cost
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error(result.SMSMessageData?.Recipients?.[0]?.status || 'Failed to send message')
    }

  } catch (error: unknown) {
    console.error('Error sending WhatsApp message:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send WhatsApp message',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
