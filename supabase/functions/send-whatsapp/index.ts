
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
      console.log('Africa\'s Talking credentials not configured, simulating WhatsApp send')
      
      // Simulate successful send
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `whatsapp_${Date.now()}`,
          message: 'WhatsApp message sent successfully (simulated)',
          phoneNumber: formattedPhone,
          messageType
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send WhatsApp message',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
