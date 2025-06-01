
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

    // First, check account balance
    console.log('Checking account balance...');
    const balanceResponse = await fetch("https://api.africastalking.com/version1/user", {
      method: "GET",
      headers: {
        "apiKey": africasTalkingApiKey,
        "Accept": "application/json"
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('Account balance info:', balanceData);
      
      if (balanceData.UserData && balanceData.UserData.balance) {
        console.log('Current balance:', balanceData.UserData.balance);
        
        // Parse balance and check if it's sufficient (assuming minimum cost is around 0.01 USD)
        const balanceMatch = balanceData.UserData.balance.match(/USD\s+([\d.]+)/);
        if (balanceMatch) {
          const balanceAmount = parseFloat(balanceMatch[1]);
          console.log('Parsed balance amount:', balanceAmount);
          
          if (balanceAmount < 0.01) {
            return new Response(JSON.stringify({ 
              error: `Insufficient balance: ${balanceData.UserData.balance}. Please top up your Africa's Talking account.`,
              success: false,
              balance: balanceData.UserData.balance
            }), {
              status: 402,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }
      }
    } else {
      console.log('Could not check balance, proceeding with SMS attempt');
    }

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

    // Prepare form data for Africa's Talking API
    const formData = new URLSearchParams();
    formData.append('username', africasTalkingUsername);
    formData.append('to', formattedPhone);
    formData.append('message', message);
    // Don't use custom sender ID - causes delays and requires approval
    
    console.log('Sending SMS to Africa\'s Talking API...');

    // Use production endpoint
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
      return new Response(JSON.stringify({ 
        error: 'SMS API processed no recipients. Please check your account balance and phone number format.',
        success: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const firstRecipient = recipients[0];
    console.log('First recipient status:', firstRecipient);
    
    // Handle different status types with detailed messages
    if (firstRecipient.status === 'InsufficientBalance') {
      console.error('Insufficient balance in Africa\'s Talking account');
      return new Response(JSON.stringify({ 
        error: 'SMS failed: Your Africa\'s Talking account has insufficient balance. Please top up your account at https://account.africastalking.com',
        success: false,
        statusCode: firstRecipient.statusCode,
        cost: firstRecipient.cost
      }), {
        status: 402, // Payment Required
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (firstRecipient.status === 'InvalidPhoneNumber') {
      console.error('Invalid phone number:', firstRecipient);
      return new Response(JSON.stringify({ 
        error: `SMS failed: Invalid phone number ${formattedPhone}. Please use a valid Tanzanian number format.`,
        success: false,
        statusCode: firstRecipient.statusCode
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Accept Success, Sent, and Queued as valid statuses
    const validStatuses = ['Success', 'Sent', 'Queued'];
    if (!validStatuses.includes(firstRecipient.status)) {
      console.error('SMS failed for recipient:', firstRecipient);
      return new Response(JSON.stringify({ 
        error: `SMS delivery failed: ${firstRecipient.status}. Status code: ${firstRecipient.statusCode}. ${firstRecipient.status === 'InsufficientBalance' ? 'Please top up your Africa\'s Talking account.' : ''}`,
        success: false,
        statusCode: firstRecipient.statusCode,
        cost: firstRecipient.cost
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
