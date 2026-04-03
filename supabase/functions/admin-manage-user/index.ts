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
        await adminClient.from("profiles").update({ email: new_email }).eq("id", user_id);
        result.message = "Email updated successfully";
        break;
      }

      case "ban_user": {
        const { ban_duration } = params;
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
        // Delete related data first - handle errors gracefully
        const tables = [
          { table: "whatsapp_messages", column: "owner_id" },
          { table: "scheduled_whatsapp_messages", column: "owner_id" },
          { table: "sales_items", column: "sale_id", subquery: true },
          { table: "inventory_movements", column: "owner_id" },
          { table: "inventory_snapshots", column: "owner_id" },
          { table: "sales_predictions", column: "owner_id" },
          { table: "business_insights", column: "owner_id" },
          { table: "income_records", column: "owner_id" },
          { table: "journal_lines", column: "entry_id", subquery: true },
          { table: "journal_entries", column: "owner_id" },
          { table: "expenses", column: "owner_id" },
          { table: "customer_transactions", column: "owner_id" },
          { table: "loan_payments", column: "loan_id", subquery: true },
          { table: "micro_loans", column: "owner_id" },
          { table: "purchase_orders", column: "owner_id" },
          { table: "suppliers", column: "owner_id" },
          { table: "discounts", column: "owner_id" },
          { table: "coupon_codes", column: "owner_id" },
          { table: "product_images", column: "product_id", subquery: true },
          { table: "sales", column: "owner_id" },
          { table: "products", column: "owner_id" },
          { table: "customers", column: "owner_id" },
          { table: "business_ads", column: "owner_id" },
          { table: "abandoned_carts", column: "seller_id" },
          { table: "admin_business_sessions", column: "owner_id" },
          { table: "business_compliance", column: "owner_id" },
          { table: "business_contracts", column: "owner_id" },
          { table: "user_activities", column: "user_id" },
          { table: "ai_chat_sessions", column: "user_id" },
          { table: "voice_commands", column: "user_id" },
          { table: "chat_messages", column: "sender_id" },
          { table: "assistant_permissions", column: "assistant_id" },
          { table: "assistant_permissions", column: "owner_id" },
          { table: "user_roles", column: "user_id" },
          { table: "user_subscriptions", column: "user_id" },
          { table: "profiles", column: "id" },
        ];

        // Delete sales_items for user's sales
        const { data: userSales } = await adminClient.from("sales").select("id").eq("owner_id", user_id);
        if (userSales && userSales.length > 0) {
          const saleIds = userSales.map((s: any) => s.id);
          await adminClient.from("sales_items").delete().in("sale_id", saleIds);
        }

        // Delete journal_lines for user's journal entries
        const { data: userJournals } = await adminClient.from("journal_entries").select("id").eq("owner_id", user_id);
        if (userJournals && userJournals.length > 0) {
          const journalIds = userJournals.map((j: any) => j.id);
          await adminClient.from("journal_lines").delete().in("entry_id", journalIds);
        }

        // Delete loan_payments for user's loans
        const { data: userLoans } = await adminClient.from("micro_loans").select("id").eq("owner_id", user_id);
        if (userLoans && userLoans.length > 0) {
          const loanIds = userLoans.map((l: any) => l.id);
          await adminClient.from("loan_payments").delete().in("loan_id", loanIds);
        }

        // Delete product_images for user's products
        const { data: userProducts } = await adminClient.from("products").select("id").eq("owner_id", user_id);
        if (userProducts && userProducts.length > 0) {
          const productIds = userProducts.map((p: any) => p.id);
          await adminClient.from("product_images").delete().in("product_id", productIds);
        }

        // Delete direct tables
        for (const { table, column, subquery } of tables) {
          if (subquery) continue; // Already handled above
          try {
            await adminClient.from(table).delete().eq(column, user_id);
          } catch (e) {
            console.log(`Warning: could not delete from ${table}: ${e}`);
          }
        }

        // Finally delete the auth user
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
    console.error("Admin manage user error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});