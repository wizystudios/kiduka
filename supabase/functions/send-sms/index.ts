
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
    
    // Using Africa's Talking SMS API for Tanzania
    const africasTalkingApiKey = Deno.env.get("AFRICAS_TALKING_API_KEY");
    const africasTalkingUsername = Deno.env.get("AFRICAS_TALKING_USERNAME");
    
    if (!africasTalkingApiKey || !africasTalkingUsername) {
      throw new Error("SMS service not configured");
    }

    // Format phone number for Tanzania
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const smsData = new URLSearchParams({
      username: africasTalkingUsername,
      to: formattedPhone,
      message: message,
      from: "KIDUKA"
    });

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
    
    if (!response.ok) {
      throw new Error(`SMS API error: ${result.message || 'Unknown error'}`);
    }

    console.log('SMS sent successfully:', result);

    return new Response(JSON.stringify({
      success: true,
      messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
      status: result.SMSMessageData?.Recipients?.[0]?.status,
      transactionId
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
