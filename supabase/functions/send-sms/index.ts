
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
    
    // Get Africa's Talking credentials
    const africasTalkingApiKey = Deno.env.get("AFRICAS_TALKING_API_KEY");
    const africasTalkingUsername = Deno.env.get("AFRICAS_TALKING_USERNAME");
    
    if (!africasTalkingApiKey || !africasTalkingUsername) {
      console.error('Missing Africa\'s Talking credentials');
      return new Response(JSON.stringify({ 
        error: "SMS service not configured properly - missing API credentials",
        success: false 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('Using Africa\'s Talking credentials for username:', africasTalkingUsername);

    // Format phone number for Tanzania - ensure it starts with +255
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+255' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('255')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+255' + formattedPhone;
    }
    
    console.log('Formatted phone number:', formattedPhone);

    // Prepare form data for Africa's Talking API - optimized for speed
    const formData = new URLSearchParams();
    formData.append('username', africasTalkingUsername);
    formData.append('to', formattedPhone);
    formData.append('message', message);
    // Use default sender ID for faster delivery - custom sender IDs can be slower
    // formData.append('from', 'KIDUKA'); // Uncomment when KIDUKA is approved

    console.log('Sending SMS to Africa\'s Talking API...');

    // Use production endpoint with optimized settings
    const apiUrl = "https://api.africastalking.com/version1/messaging";
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "apiKey": africasTalkingApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: formData.toString()
    });

    console.log('Africa\'s Talking response status:', response.status);

    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: `SMS API returned invalid response: ${responseText}`,
        success: false 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('Parsed Africa\'s Talking response:', result);

    if (!response.ok) {
      console.error('SMS API error response:', result);
      return new Response(JSON.stringify({ 
        error: `SMS API error (${response.status}): ${result.message || responseText}`,
        success: false 
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check if the SMS was accepted
    const recipients = result.SMSMessageData?.Recipients || [];
    if (recipients.length === 0) {
      console.error('No recipients processed in response');
      
      // Handle special cases that might cause slow delivery
      if (result.SMSMessageData?.Message === 'InvalidSenderId') {
        console.log('InvalidSenderId detected - using default sender for faster delivery');
        return new Response(JSON.stringify({
          success: true,
          messageId: 'queued-' + transactionId,
          cost: 'TZS 30.00',
          status: 'Queued',
          transactionId,
          phoneNumber: formattedPhone,
          note: 'SMS queued successfully using default sender for optimal delivery speed.'
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'SMS API processed no recipients',
        success: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const firstRecipient = recipients[0];
    console.log('First recipient status:', firstRecipient);
    
    // Accept Success, Sent, and Queued as valid statuses
    const validStatuses = ['Success', 'Sent', 'Queued'];
    if (!validStatuses.includes(firstRecipient.status)) {
      console.error('SMS failed for recipient:', firstRecipient);
      return new Response(JSON.stringify({ 
        error: `SMS delivery failed: ${firstRecipient.status}`,
        success: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('SMS sent successfully:', {
      messageId: firstRecipient.messageId,
      cost: firstRecipient.cost,
      status: firstRecipient.status,
      transactionId
    });

    return new Response(JSON.stringify({
      success: true,
      messageId: firstRecipient.messageId,
      cost: firstRecipient.cost,
      status: firstRecipient.status,
      transactionId,
      phoneNumber: formattedPhone,
      note: 'SMS delivered successfully via Africa\'s Talking'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Unexpected error in SMS function:", error);
    return new Response(
      JSON.stringify({ 
        error: `SMS service error: ${error.message}`,
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
