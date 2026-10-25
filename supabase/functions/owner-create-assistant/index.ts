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

    const json = (b: unknown) => new Response(JSON.stringify(b), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const normEmail = String(email).trim().toLowerCase();

    const linkAssistant = async (assistantId: string) => {
      const { data, error } = await adminClient.rpc("add_assistant_permission", {
        p_assistant_id: assistantId,
        p_owner_id: caller.id,
        p_business_name: bizName,
      });
      return { data, error };
    };

    // Create the assistant auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: normEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        business_name: bizName,
        role: "assistant",
        owner_id: caller.id,
      },
    });

    let assistantId: string | null = created?.user?.id ?? null;
    let createdNow = !!assistantId;

    if (createErr || !created?.user) {
      const raw = createErr?.message || "";
      if (/already|registered|exists/i.test(raw)) {
        // Recover an account this same owner started creating earlier (e.g. a
        // dropped connection left it half-made). Never touch other people's accounts.
        let existing: any = null;
        for (let page = 1; page <= 20 && !existing; page++) {
          const { data: list } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
          const users = list?.users || [];
          existing = users.find((u: any) => (u.email || "").toLowerCase() === normEmail) || null;
          if (users.length < 1000) break;
        }
        if (existing) {
          const [{ data: perm }, { data: exRoles }, { count: memberCount }] = await Promise.all([
            adminClient.from("assistant_permissions").select("owner_id").eq("assistant_id", existing.id).maybeSingle(),
            adminClient.from("user_roles").select("role").eq("user_id", existing.id),
            adminClient.from("business_members").select("id", { count: "exact", head: true }).eq("user_id", existing.id).eq("role", "owner"),
          ]);
          const privileged = (exRoles || []).some((r: any) => r.role === "owner" || r.role === "super_admin");
          const startedByCaller = existing.user_metadata?.owner_id === caller.id;
          const mine = perm ? perm.owner_id === caller.id : startedByCaller;
          if (mine && !privileged && !memberCount) {
            const { error: updErr } = await adminClient.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
              user_metadata: { ...(existing.user_metadata || {}), full_name, business_name: bizName, role: "assistant", owner_id: caller.id },
            });
            if (updErr) {
              const weak = /weak|easy to guess|pwned|leaked/i.test(updErr.message || "");
              return json({ error: weak
                ? "Nywila hii ni rahisi kukisiwa au imevuja mtandaoni. Chagua nywila nyingine ya kipekee (mf. herufi na namba zisizo za kawaida)."
                : "Imeshindwa kukamilisha akaunti ya msaidizi. Jaribu tena." });
            }
            assistantId = existing.id;
          }
        }
        if (!assistantId) {
          return json({ error: "Barua pepe hii tayari ina akaunti. Tumia 'Unganisha msaidizi aliyepo' au barua pepe nyingine." });
        }
      } else {
        let msg = "Imeshindwa kuunda akaunti ya msaidizi. Jaribu tena.";
        if (/weak|easy to guess|pwned|leaked/i.test(raw)) msg = "Nywila hii ni rahisi kukisiwa au imevuja mtandaoni. Chagua nywila nyingine ya kipekee (mf. herufi na namba zisizo za kawaida).";
        else if (/invalid.*email|email.*invalid/i.test(raw)) msg = "Barua pepe si sahihi.";
        return json({ error: msg });
      }
    }

    // Link profile, role and permissions; never leave a half-made account behind
    const { data: linkResult, error: linkErr } = await linkAssistant(assistantId!);

    if (linkErr) {
      console.error("Link error:", linkErr);
      if (createdNow) await adminClient.auth.admin.deleteUser(assistantId!).catch(() => null);
      return json({ error: "Imeshindwa kumuunganisha msaidizi na biashara. Hakuna akaunti iliyobaki—jaribu tena." });
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
