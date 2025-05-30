
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phoneNumber: string;
  message: string;
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message, transactionId }: SMSRequest = await req.json();
    
    console.log('SMS request received:', { phoneNumber, transactionId });
    
    // Using Africa's Talking SMS API for Tanzania
    const africasTalkingApiKey = Deno.env.get("AFRICAS_TALKING_API_KEY");
    const africasTalkingUsername = Deno.env.get("AFRICAS_TALKING_USERNAME");
    
    if (!africasTalkingApiKey || !africasTalkingUsername) {
      console.error('Missing Africa\'s Talking credentials');
      throw new Error("SMS service not configured - missing API credentials");
    }

    console.log('Using Africa\'s Talking credentials:', { username: africasTalkingUsername });

    // Format phone number for Tanzania - ensure it starts with +255
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+255' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('255')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    console.log('Formatted phone number:', formattedPhone);

    const smsData = new URLSearchParams({
      username: africasTalkingUsername,
      to: formattedPhone,
      message: message,
      from: "KIDUKA"
    });

    console.log('Sending SMS to Africa\'s Talking API...');

    const response = await fetch("https://api.sandbox.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey": africasTalkingApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: smsData
    });

    const result = await response.json();
    
    console.log('Africa\'s Talking API response:', result);

    if (!response.ok) {
      console.error('SMS API error:', result);
      throw new Error(`SMS API error: ${result.message || 'Unknown error'}`);
    }

    // Check if the SMS was accepted
    const recipients = result.SMSMessageData?.Recipients || [];
    if (recipients.length === 0) {
      throw new Error('No recipients processed');
    }

    const firstRecipient = recipients[0];
    if (firstRecipient.status !== 'Success') {
      throw new Error(`SMS failed: ${firstRecipient.status}`);
    }

    console.log('SMS sent successfully:', {
      messageId: firstRecipient.messageId,
      status: firstRecipient.status,
      transactionId
    });

    return new Response(JSON.stringify({
      success: true,
      messageId: firstRecipient.messageId,
      status: firstRecipient.status,
      transactionId,
      phoneNumber: formattedPhone
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
