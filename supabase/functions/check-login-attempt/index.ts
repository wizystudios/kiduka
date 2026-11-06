import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { identifyCaller } from "../_shared/caller.ts";

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

    const { action, email: rawEmail, password } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
    if (!email || email.length > 320) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Failures and locks are counted per sign-in origin, so a stranger cannot lock someone else's account.
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip || "unknown"));
    const clientKey = Array.from(new Uint8Array(digest)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");

    if (action === "check") {
      // Lock status is only disclosed to the signed-in owner of this exact account.
      const checker = await identifyCaller(req);
      if (checker.kind !== "user" || checker.email !== email.toLowerCase()) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data } = await adminClient
        .from("login_attempts")
        .select("*")
        .eq("email", email.toLowerCase()).eq("client_key", clientKey)
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
      // Only count a failure the server itself confirms: the password must actually be wrong.
      if (typeof password !== "string" || !password || password.length > 256) {
        return new Response(JSON.stringify({ error: "Password required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const probe = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      const { data: ok } = await probe.auth.signInWithPassword({ email: email.toLowerCase(), password });
      if (ok?.session) {
        await probe.auth.signOut().catch(() => {});
        return new Response(JSON.stringify({ attempts: 0, locked: false, remaining: 5 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await adminClient
        .from("login_attempts")
        .select("*")
        .eq("email", email.toLowerCase()).eq("client_key", clientKey)
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
            message: `Akaunti ${email.slice(0,1)}***@${email.split("@")[1] || ""} imezuiwa baada ya majaribio 5 yasiyofanikiwa.`,
            data: { email, locked_until: updates.locked_until, attempt_count: newCount }
          });
        }

        await adminClient
          .from("login_attempts")
          .update(updates)
          .eq("email", email.toLowerCase()).eq("client_key", clientKey);

        return new Response(JSON.stringify({
          attempts: newCount,
          locked: newCount >= 5,
          remaining: Math.max(0, 5 - newCount)
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        await adminClient.from("login_attempts").insert({
          email: email.toLowerCase(),
          client_key: clientKey,
          attempt_count: 1,
          last_attempt_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({
          attempts: 1, locked: false, remaining: 4
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "reset") {
      // Only the person who just signed in to this exact account may clear its counter.
      const caller = await identifyCaller(req);
      if (caller.kind !== "user" || caller.email !== email.toLowerCase()) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
