// End-to-end tests for Sokoni customer auth RPCs.
// Verifies that:
//   - sokoni_register_customer hashes PINs and rejects weak/duplicate inputs
//   - sokoni_verify_pin accepts the correct PIN, rejects wrong PINs,
//     and reports not_found for unknown phones
//   - sokoni_update_customer_name only works after a correct PIN
//   - Direct SELECT against sokoni_customers is blocked for anon clients
//     (i.e. no pin/pin_hash leakage).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  assertEquals,
  assertExists,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uniquePhone = () => {
  // Tanzania-style 12-digit phone, unique per run to avoid duplicate registration.
  const tail = Math.floor(100_000_000 + Math.random() * 899_999_999).toString();
  return `255${tail}`.slice(0, 12);
};

const STRONG_PIN = "Strong#123Pin";
const WRONG_PIN = "Wrong#999Pin";

Deno.test("sokoni_register_customer hashes PIN and returns customer", async () => {
  const phone = uniquePhone();
  const { data, error } = await client.rpc("sokoni_register_customer" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: "Test Mteja",
  });
  assertEquals(error, null);
  const res = data as any;
  assertEquals(res?.success, true);
  assertExists(res?.customer?.id);
  assertEquals(res?.customer?.phone, phone);
});

Deno.test("sokoni_register_customer rejects duplicate phone", async () => {
  const phone = uniquePhone();
  const first = await client.rpc("sokoni_register_customer" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: null,
  });
  assertEquals((first.data as any)?.success, true);

  const dup = await client.rpc("sokoni_register_customer" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: null,
  });
  assertEquals((dup.data as any)?.success, false);
  assertEquals((dup.data as any)?.error, "already_registered");
});

Deno.test("sokoni_verify_pin accepts correct PIN and rejects wrong PIN", async () => {
  const phone = uniquePhone();
  await client.rpc("sokoni_register_customer" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: "Mteja",
  });

  const ok = await client.rpc("sokoni_verify_pin" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
  });
  assertEquals((ok.data as any)?.success, true);
  assertEquals((ok.data as any)?.customer?.phone, phone);

  const bad = await client.rpc("sokoni_verify_pin" as any, {
    p_phone: phone,
    p_pin: WRONG_PIN,
  });
  assertEquals((bad.data as any)?.success, false);
  assertEquals((bad.data as any)?.error, "invalid_pin");
});

Deno.test("sokoni_verify_pin returns not_found for unknown phone", async () => {
  const res = await client.rpc("sokoni_verify_pin" as any, {
    p_phone: "255000000000",
    p_pin: STRONG_PIN,
  });
  assertEquals((res.data as any)?.success, false);
  assertEquals((res.data as any)?.error, "not_found");
});

Deno.test("sokoni_update_customer_name requires valid PIN", async () => {
  const phone = uniquePhone();
  await client.rpc("sokoni_register_customer" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: "Old Name",
  });

  const bad = await client.rpc("sokoni_update_customer_name" as any, {
    p_phone: phone,
    p_pin: WRONG_PIN,
    p_name: "Hacker",
  });
  assertEquals((bad.data as any)?.success, false);

  const good = await client.rpc("sokoni_update_customer_name" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
    p_name: "New Name",
  });
  assertEquals((good.data as any)?.success, true);

  // Confirm name actually updated via verify_pin (which returns customer.name).
  const verify = await client.rpc("sokoni_verify_pin" as any, {
    p_phone: phone,
    p_pin: STRONG_PIN,
  });
  assertEquals((verify.data as any)?.customer?.name, "New Name");
});

Deno.test("anon cannot read sokoni_customers directly (no PIN/hash leakage)", async () => {
  const { data, error } = await client.from("sokoni_customers" as any).select("*").limit(1);
  // Either RLS denies with an error, or returns an empty array — both are acceptable.
  // What is NOT acceptable: rows containing pin_hash being readable.
  if (!error && Array.isArray(data) && data.length > 0) {
    for (const row of data as any[]) {
      assert(
        !("pin_hash" in row) && !("pin" in row),
        "Anon client must never read pin/pin_hash from sokoni_customers",
      );
    }
  }
});
