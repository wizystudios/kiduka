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
    const authHeader = req.headers.get("Authorization")!;

    // Verify caller is super_admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check super_admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not a super admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id, ...params } = body;

    let result: any = { success: true };

    switch (action) {
      case "change_password": {
        const { new_password } = params;
        if (!new_password || new_password.length < 6) {
          return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.updateUser(user_id, {
          password: new_password,
        });
        if (error) throw error;
        result.message = "Password changed successfully";
        break;
      }

      case "update_email": {
        const { new_email } = params;
        const { error } = await adminClient.auth.admin.updateUser(user_id, {
          email: new_email,
          email_confirm: true,
        });
        if (error) throw error;
        // Also update profile
        await adminClient.from("profiles").update({ email: new_email }).eq("id", user_id);
        result.message = "Email updated successfully";
        break;
      }

      case "ban_user": {
        const { ban_duration } = params; // e.g., "24h", "7d", "permanent"
        let banUntil: string | undefined;
        
        if (ban_duration === "permanent") {
          // Ban for 100 years effectively = permanent
          const d = new Date();
          d.setFullYear(d.getFullYear() + 100);
          banUntil = d.toISOString();
        } else if (ban_duration) {
          const d = new Date();
          const match = ban_duration.match(/^(\d+)(h|d|w|m|y)$/);
          if (match) {
            const num = parseInt(match[1]);
            switch (match[2]) {
              case "h": d.setHours(d.getHours() + num); break;
              case "d": d.setDate(d.getDate() + num); break;
              case "w": d.setDate(d.getDate() + num * 7); break;
              case "m": d.setMonth(d.getMonth() + num); break;
              case "y": d.setFullYear(d.getFullYear() + num); break;
            }
            banUntil = d.toISOString();
          }
        }

        const { error } = await adminClient.auth.admin.updateUser(user_id, {
          ban_duration: ban_duration === "permanent" ? "876000h" : ban_duration,
        });
        if (error) throw error;
        result.message = `User banned${ban_duration === "permanent" ? " permanently" : ` for ${ban_duration}`}`;
        break;
      }

      case "unban_user": {
        const { error } = await adminClient.auth.admin.updateUser(user_id, {
          ban_duration: "none",
        });
        if (error) throw error;
        result.message = "User unbanned successfully";
        break;
      }

      case "delete_user": {
        // Delete related data first
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("assistant_permissions").delete().eq("assistant_id", user_id);
        await adminClient.from("user_subscriptions").delete().eq("user_id", user_id);
        await adminClient.from("profiles").delete().eq("id", user_id);
        
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        result.message = "User deleted completely";
        break;
      }

      case "get_user_details": {
        const { data: { user: targetUser }, error } = await adminClient.auth.admin.getUserById(user_id);
        if (error) throw error;
        result.user = {
          id: targetUser?.id,
          email: targetUser?.email,
          created_at: targetUser?.created_at,
          last_sign_in_at: targetUser?.last_sign_in_at,
          banned_until: targetUser?.banned_until,
          confirmed_at: targetUser?.confirmed_at,
          phone: targetUser?.phone,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
