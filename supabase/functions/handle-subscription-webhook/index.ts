import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const { user_id, plan_id } = session.metadata || {};
          
          if (user_id && plan_id) {
            // Update user subscription
            await supabase
              .from('user_subscriptions')
              .upsert({
                user_id,
                plan_id,
                status: 'active',
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                last_payment_date: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Extend subscription
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'active',
              subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
              last_payment_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Webhook Error: ${errorMessage}`, { status: 500 });
  }
});