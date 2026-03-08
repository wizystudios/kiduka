import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { action, email } = await req.json();

    if (action === "check") {
      // Check if account is locked
      const { data } = await adminClient
        .from("login_attempts")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();

      if (data && data.locked_until) {
        const lockedUntil = new Date(data.locked_until);
        if (lockedUntil > new Date()) {
          return new Response(JSON.stringify({
            locked: true,
            locked_until: data.locked_until,
            message: "Akaunti imezuiwa. Wasiliana na msimamizi."
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({ locked: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "record_failure") {
      // Record a failed login attempt
      const { data: existing } = await adminClient
        .from("login_attempts")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) {
        const newCount = existing.attempt_count + 1;
        const updates: any = {
          attempt_count: newCount,
          last_attempt_at: new Date().toISOString()
        };

        // Lock after 5 failures
        if (newCount >= 5) {
          const lockUntil = new Date();
          lockUntil.setHours(lockUntil.getHours() + 24);
          updates.locked_until = lockUntil.toISOString();
          updates.locked_by = "system";

          // Notify admin
          await adminClient.from("admin_notifications").insert({
            notification_type: "account_locked",
            title: "Akaunti Imezuiwa",
            message: `Akaunti ${email} imezuiwa baada ya majaribio 5 yasiyofanikiwa.`,
            data: { email, locked_until: updates.locked_until, attempt_count: newCount }
          });
        }

        await adminClient
          .from("login_attempts")
          .update(updates)
          .eq("email", email.toLowerCase());

        return new Response(JSON.stringify({
          attempts: newCount,
          locked: newCount >= 5,
          remaining: Math.max(0, 5 - newCount)
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        await adminClient.from("login_attempts").insert({
          email: email.toLowerCase(),
          attempt_count: 1,
          last_attempt_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({
          attempts: 1, locked: false, remaining: 4
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "reset") {
      // Reset attempts on successful login
      await adminClient
        .from("login_attempts")
        .update({ attempt_count: 0, locked_until: null, locked_by: null })
        .eq("email", email.toLowerCase());

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "admin_unlock") {
      // Admin unlocks account
      const authHeader = req.headers.get("Authorization")!;
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await anonClient.auth.getUser();
      if (!caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: roleData } = await adminClient
        .from("user_roles").select("role")
        .eq("user_id", caller.id).eq("role", "super_admin").single();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Not admin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await adminClient
        .from("login_attempts")
        .update({ attempt_count: 0, locked_until: null, locked_by: null })
        .eq("email", email.toLowerCase());

      return new Response(JSON.stringify({ success: true, message: "Akaunti imefunguliwa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
