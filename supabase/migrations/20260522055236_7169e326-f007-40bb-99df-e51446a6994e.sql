
-- ============================================================
-- PHASE 1: Admin business deletion RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_business(
  p_owner_id uuid,
  p_confirmation_name text,
  p_scope jsonb DEFAULT '{"all": true}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_expected_name text;
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
  v_all boolean;
BEGIN
  -- Authorize: super_admin only
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Load profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_owner_id;
  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Name confirmation (case-insensitive, trim)
  v_expected_name := COALESCE(NULLIF(trim(v_profile.business_name), ''),
                              NULLIF(trim(v_profile.full_name), ''),
                              v_profile.email);
  IF lower(trim(p_confirmation_name)) <> lower(v_expected_name) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'name_mismatch',
      'expected_hint', left(v_expected_name, 3) || '***'
    );
  END IF;

  v_all := COALESCE((p_scope->>'all')::boolean, false);

  -- ===== Bidhaa / Sales (always cascade together if either selected) =====
  IF v_all OR COALESCE((p_scope->>'sales')::boolean, false) OR COALESCE((p_scope->>'products')::boolean, false) THEN
    DELETE FROM public.sales_items WHERE sale_id IN (SELECT id FROM public.sales WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_items', v_count);
    DELETE FROM public.sales WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'products')::boolean, false) THEN
    DELETE FROM public.inventory_movements WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_movements', v_count);
    DELETE FROM public.inventory_snapshots WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_snapshots', v_count);
    DELETE FROM public.products WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('products', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'customers')::boolean, false) THEN
    DELETE FROM public.customer_transactions WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customer_transactions', v_count);
    DELETE FROM public.customers WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customers', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'loans')::boolean, false) THEN
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('loan_payments', v_count);
    DELETE FROM public.micro_loans WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('micro_loans', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'orders')::boolean, false) THEN
    BEGIN
      DELETE FROM public.sokoni_orders WHERE seller_id = p_owner_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sokoni_orders', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      DELETE FROM public.abandoned_carts WHERE seller_id = p_owner_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('abandoned_carts', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      DELETE FROM public.return_requests WHERE seller_id = p_owner_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('return_requests', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF v_all OR COALESCE((p_scope->>'staff')::boolean, false) THEN
    BEGIN
      DELETE FROM public.assistant_permissions WHERE owner_id = p_owner_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('assistant_permissions', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      DELETE FROM public.branch_staff WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('branch_staff', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF v_all OR COALESCE((p_scope->>'branches')::boolean, false) THEN
    DELETE FROM public.business_branches WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_branches', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'finance')::boolean, false) THEN
    DELETE FROM public.expenses WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expenses', v_count);
    DELETE FROM public.income_records WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('income_records', v_count);
    DELETE FROM public.journal_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE owner_id = p_owner_id);
    DELETE FROM public.journal_entries WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_entries', v_count);
  END IF;

  -- Always-delete misc when wiping ALL
  IF v_all THEN
    BEGIN DELETE FROM public.discounts WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.coupon_codes WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_ads WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_insights WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.marketplace_listings WHERE seller_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_compliance WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_contracts WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.user_subscriptions WHERE user_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_members WHERE user_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    -- Delete business rows where this user was the sole creator and has no other members
    BEGIN
      DELETE FROM public.businesses
      WHERE created_by = p_owner_id
        AND NOT EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = businesses.id);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('businesses', v_count);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- Audit
  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES (
    'business_deleted',
    CASE WHEN v_all THEN 'Biashara imefutwa kabisa' ELSE 'Sehemu ya biashara imefutwa' END,
    format('Admin %s amefuta data ya %s. Scope: %s', auth.uid()::text, v_expected_name, p_scope::text),
    jsonb_build_object(
      'owner_id', p_owner_id,
      'business_name', v_expected_name,
      'scope', p_scope,
      'deleted_counts', v_deleted,
      'admin_id', auth.uid(),
      'at', now()
    )
  );

  RETURN json_build_object('success', true, 'deleted', v_deleted, 'all', v_all);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_business(uuid, text, jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_business(uuid, text, jsonb) TO authenticated;

-- ============================================================
-- PHASE 4: Sokoni PIN rate limit + lockout
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sokoni_pin_attempts (
  phone text PRIMARY KEY,
  attempt_count int NOT NULL DEFAULT 0,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);

ALTER TABLE public.sokoni_pin_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages pin attempts" ON public.sokoni_pin_attempts;
CREATE POLICY "Service role manages pin attempts"
ON public.sokoni_pin_attempts FOR ALL
USING (false) WITH CHECK (false);

-- Replace sokoni_verify_pin with lockout logic
CREATE OR REPLACE FUNCTION public.sokoni_verify_pin(p_phone text, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.sokoni_customers%ROWTYPE;
  v_att public.sokoni_pin_attempts%ROWTYPE;
  v_max_attempts int := 5;
  v_window_minutes int := 15;
  v_lock_minutes int := 30;
BEGIN
  -- Check lockout
  SELECT * INTO v_att FROM public.sokoni_pin_attempts WHERE phone = p_phone;
  IF v_att.locked_until IS NOT NULL AND v_att.locked_until > now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'locked',
      'retry_after_seconds', ceil(extract(epoch from (v_att.locked_until - now())))::int
    );
  END IF;

  SELECT * INTO v_row FROM public.sokoni_customers WHERE phone = p_phone;
  IF v_row.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_row.pin_hash IS NULL THEN
    UPDATE public.sokoni_customers
      SET pin_hash = crypt(p_pin, gen_salt('bf', 10))
      WHERE id = v_row.id;
    DELETE FROM public.sokoni_pin_attempts WHERE phone = p_phone;
    RETURN json_build_object(
      'success', true, 'first_time', true,
      'customer', json_build_object('id', v_row.id, 'phone', v_row.phone, 'name', v_row.name)
    );
  END IF;

  IF v_row.pin_hash = crypt(p_pin, v_row.pin_hash) THEN
    DELETE FROM public.sokoni_pin_attempts WHERE phone = p_phone;
    RETURN json_build_object(
      'success', true,
      'customer', json_build_object('id', v_row.id, 'phone', v_row.phone, 'name', v_row.name)
    );
  END IF;

  -- Wrong PIN — record attempt
  INSERT INTO public.sokoni_pin_attempts (phone, attempt_count, first_attempt_at, last_attempt_at)
  VALUES (p_phone, 1, now(), now())
  ON CONFLICT (phone) DO UPDATE
  SET attempt_count = CASE
        WHEN public.sokoni_pin_attempts.first_attempt_at < now() - (v_window_minutes || ' minutes')::interval
          THEN 1
        ELSE public.sokoni_pin_attempts.attempt_count + 1
      END,
      first_attempt_at = CASE
        WHEN public.sokoni_pin_attempts.first_attempt_at < now() - (v_window_minutes || ' minutes')::interval
          THEN now()
        ELSE public.sokoni_pin_attempts.first_attempt_at
      END,
      last_attempt_at = now(),
      locked_until = CASE
        WHEN (CASE
                WHEN public.sokoni_pin_attempts.first_attempt_at < now() - (v_window_minutes || ' minutes')::interval THEN 1
                ELSE public.sokoni_pin_attempts.attempt_count + 1
              END) >= v_max_attempts
          THEN now() + (v_lock_minutes || ' minutes')::interval
        ELSE NULL
      END
  RETURNING * INTO v_att;

  IF v_att.locked_until IS NOT NULL AND v_att.locked_until > now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'locked',
      'retry_after_seconds', ceil(extract(epoch from (v_att.locked_until - now())))::int,
      'attempts', v_att.attempt_count
    );
  END IF;

  RETURN json_build_object(
    'success', false,
    'error', 'invalid_pin',
    'attempts_remaining', greatest(0, v_max_attempts - v_att.attempt_count)
  );
END;
$$;
