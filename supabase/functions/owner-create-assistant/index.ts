import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify caller (must be owner)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // deno-lint-ignore no-explicit-any
    const adminClient: any = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an owner (or super_admin)
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const allowed = (roles || []).some((r: any) => r.role === "owner" || r.role === "super_admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Only owners can create assistants" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, business_name } = body || {};

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "email, password, full_name are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's business_name from profile if not supplied
    let bizName = business_name;
    if (!bizName) {
      const { data: prof } = await adminClient
        .from("profiles")
        .select("business_name")
        .eq("id", caller.id)
        .maybeSingle();
      bizName = prof?.business_name || "";
    }

    // Create the assistant auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        business_name: bizName,
        role: "assistant",
        owner_id: caller.id,
      },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message || "Failed to create user";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assistantId = created.user.id;

    // Link permissions via secure RPC (handles profile, role, permissions row)
    const { data: linkResult, error: linkErr } = await adminClient.rpc("add_assistant_permission", {
      p_assistant_id: assistantId,
      p_owner_id: caller.id,
      p_business_name: bizName,
    });

    if (linkErr) {
      console.error("Link error:", linkErr);
      return new Response(JSON.stringify({
        warning: "Assistant created but permissions failed",
        assistant_id: assistantId,
        error: linkErr.message,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      assistant_id: assistantId,
      link: linkResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("owner-create-assistant error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
