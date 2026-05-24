CREATE OR REPLACE FUNCTION public.resolve_business_id_from_owner(_owner_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT business_id
  FROM public.business_members
  WHERE user_id = _owner_id AND role = 'owner' AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1;
$$;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.income_records ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.inventory_snapshots ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.business_insights ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.sokoni_orders ADD COLUMN IF NOT EXISTS business_id uuid;

UPDATE public.expenses SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.income_records SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.journal_entries SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.inventory_movements SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.inventory_snapshots SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.discounts SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.business_insights SET business_id = public.resolve_business_id_from_owner(owner_id) WHERE business_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.sokoni_orders SET business_id = public.resolve_business_id_from_owner(seller_id) WHERE business_id IS NULL AND seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_income_records_business_id ON public.income_records(business_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_id ON public.journal_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_id ON public.inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_business_id ON public.inventory_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_discounts_business_id ON public.discounts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_insights_business_id ON public.business_insights(business_id);
CREATE INDEX IF NOT EXISTS idx_sokoni_orders_business_id ON public.sokoni_orders(business_id);

CREATE OR REPLACE FUNCTION public.set_business_id_from_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.owner_id IS NOT NULL THEN
    NEW.business_id := public.resolve_business_id_from_owner(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sokoni_order_business_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.seller_id IS NOT NULL THEN
    NEW.business_id := public.resolve_business_id_from_owner(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','sales','customers','expenses','income_records','journal_entries','inventory_movements','inventory_snapshots','discounts','business_insights']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_business_id_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_set_business_id_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_business_id_from_owner()', t, t);
  END LOOP;
  DROP TRIGGER IF EXISTS trg_set_business_id_sokoni_orders ON public.sokoni_orders;
  CREATE TRIGGER trg_set_business_id_sokoni_orders BEFORE INSERT OR UPDATE ON public.sokoni_orders FOR EACH ROW EXECUTE FUNCTION public.set_sokoni_order_business_id();
END $$;

CREATE TABLE IF NOT EXISTS public.business_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  actor_id uuid DEFAULT auth.uid(),
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_business_audit_logs_business_created ON public.business_audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_audit_logs_entity ON public.business_audit_logs (entity_type, entity_id);

DROP POLICY IF EXISTS "Super admins can view all business audit logs" ON public.business_audit_logs;
DROP POLICY IF EXISTS "Business members can view their audit logs" ON public.business_audit_logs;
DROP POLICY IF EXISTS "System can insert business audit logs" ON public.business_audit_logs;

CREATE POLICY "Super admins can view all business audit logs"
  ON public.business_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Business members can view their audit logs"
  ON public.business_audit_logs FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.is_business_member(business_id, auth.uid()));

CREATE POLICY "System can insert business audit logs"
  ON public.business_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_business_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payload jsonb;
  v_business_id uuid;
  v_entity_id text;
  v_name text;
BEGIN
  v_payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_entity_id := COALESCE(v_payload->>'id', v_payload->>'user_id', v_payload->>'assistant_id');
  v_business_id := COALESCE(
    NULLIF(v_payload->>'business_id', '')::uuid,
    CASE WHEN NULLIF(v_payload->>'owner_id', '') IS NOT NULL THEN public.resolve_business_id_from_owner((v_payload->>'owner_id')::uuid) END,
    CASE WHEN NULLIF(v_payload->>'seller_id', '') IS NOT NULL THEN public.resolve_business_id_from_owner((v_payload->>'seller_id')::uuid) END,
    CASE WHEN TG_TABLE_NAME = 'profiles' AND NULLIF(v_payload->>'id', '') IS NOT NULL THEN public.resolve_business_id_from_owner((v_payload->>'id')::uuid) END
  );
  v_name := COALESCE(v_payload->>'name', v_payload->>'branch_name', v_payload->>'full_name', v_payload->>'email', v_payload->>'tracking_code', left(COALESCE(v_entity_id, TG_TABLE_NAME), 12));

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (
    v_business_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_entity_id,
    lower(TG_OP),
    format('%s: %s (%s)', TG_TABLE_NAME, lower(TG_OP), COALESCE(v_name, 'rekodi')),
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP, 'name', v_name)
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','sales','customers','expenses','sokoni_orders','business_branches','assistant_permissions','business_members','profiles','income_records','journal_entries']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_business_audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_business_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_business_audit_change()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_business_ownership_audit(p_business_id uuid DEFAULT NULL)
RETURNS TABLE(area text, issue text, affected_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT 'products'::text area, 'missing_business_id'::text issue, count(*) affected_count FROM public.products p WHERE (p_business_id IS NULL OR p.business_id = p_business_id OR public.resolve_business_id_from_owner(p.owner_id) = p_business_id) AND p.business_id IS NULL
    UNION ALL SELECT 'sales', 'missing_business_id', count(*) FROM public.sales s WHERE (p_business_id IS NULL OR s.business_id = p_business_id OR public.resolve_business_id_from_owner(s.owner_id) = p_business_id) AND s.business_id IS NULL
    UNION ALL SELECT 'customers', 'missing_business_id', count(*) FROM public.customers c WHERE (p_business_id IS NULL OR c.business_id = p_business_id OR public.resolve_business_id_from_owner(c.owner_id) = p_business_id) AND c.business_id IS NULL
    UNION ALL SELECT 'expenses', 'missing_business_id', count(*) FROM public.expenses e WHERE (p_business_id IS NULL OR e.business_id = p_business_id OR public.resolve_business_id_from_owner(e.owner_id) = p_business_id) AND e.business_id IS NULL
    UNION ALL SELECT 'income_records', 'missing_business_id', count(*) FROM public.income_records i WHERE (p_business_id IS NULL OR i.business_id = p_business_id OR public.resolve_business_id_from_owner(i.owner_id) = p_business_id) AND i.business_id IS NULL
    UNION ALL SELECT 'journal_entries', 'missing_business_id', count(*) FROM public.journal_entries j WHERE (p_business_id IS NULL OR j.business_id = p_business_id OR public.resolve_business_id_from_owner(j.owner_id) = p_business_id) AND j.business_id IS NULL
    UNION ALL SELECT 'sokoni_orders', 'missing_business_id', count(*) FROM public.sokoni_orders o WHERE (p_business_id IS NULL OR o.business_id = p_business_id OR public.resolve_business_id_from_owner(o.seller_id) = p_business_id) AND o.business_id IS NULL
    UNION ALL SELECT 'business_members', 'inactive_or_missing_member', count(*) FROM public.business_members bm WHERE (p_business_id IS NULL OR bm.business_id = p_business_id) AND bm.is_active IS DISTINCT FROM true
  ) x
  WHERE public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ORDER BY affected_count DESC, area;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_business_ownership_audit(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_business_ownership_audit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_business(p_owner_id uuid, p_confirmation_name text, p_scope jsonb DEFAULT '{"all": true}'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_expected_name text;
  v_business_id uuid;
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
  v_all boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN RETURN json_build_object('success', false, 'error', 'unauthorized'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_owner_id;
  IF v_profile.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
  v_business_id := public.resolve_business_id_from_owner(p_owner_id);
  v_expected_name := COALESCE(NULLIF(trim(v_profile.business_name), ''), NULLIF(trim(v_profile.full_name), ''), v_profile.email);
  IF lower(trim(p_confirmation_name)) <> lower(v_expected_name) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected_hint', left(v_expected_name, 3) || '***'); END IF;
  v_all := COALESCE((p_scope->>'all')::boolean, false);

  IF v_all OR COALESCE((p_scope->>'sales')::boolean, false) OR COALESCE((p_scope->>'products')::boolean, false) THEN
    DELETE FROM public.sales_items WHERE sale_id IN (SELECT id FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id); GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_items', v_count);
    DELETE FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales', v_count);
  END IF;
  IF v_all OR COALESCE((p_scope->>'products')::boolean, false) THEN
    DELETE FROM public.inventory_movements WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_movements', v_count);
    DELETE FROM public.inventory_snapshots WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_snapshots', v_count);
    DELETE FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('products', v_count);
  END IF;
  IF v_all OR COALESCE((p_scope->>'customers')::boolean, false) THEN
    DELETE FROM public.customer_transactions WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customer_transactions', v_count);
    DELETE FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customers', v_count);
  END IF;
  IF v_all OR COALESCE((p_scope->>'loans')::boolean, false) THEN
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE owner_id = p_owner_id); GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('loan_payments', v_count);
    DELETE FROM public.micro_loans WHERE owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('micro_loans', v_count);
  END IF;
  IF v_all OR COALESCE((p_scope->>'orders')::boolean, false) THEN
    DELETE FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sokoni_orders', v_count);
    BEGIN DELETE FROM public.abandoned_carts WHERE seller_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('abandoned_carts', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.return_requests WHERE seller_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('return_requests', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF v_all OR COALESCE((p_scope->>'staff')::boolean, false) THEN
    BEGIN DELETE FROM public.assistant_permissions WHERE owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('assistant_permissions', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.branch_staff WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id); GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('branch_staff', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner'; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_staff_members', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF v_all OR COALESCE((p_scope->>'branches')::boolean, false) THEN
    DELETE FROM public.business_branches WHERE owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_branches', v_count);
  END IF;
  IF v_all OR COALESCE((p_scope->>'finance')::boolean, false) THEN
    DELETE FROM public.expenses WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expenses', v_count);
    DELETE FROM public.income_records WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('income_records', v_count);
    DELETE FROM public.journal_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id);
    DELETE FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_entries', v_count);
  END IF;
  IF v_all THEN
    BEGIN DELETE FROM public.discounts WHERE business_id = v_business_id OR owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.coupon_codes WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_ads WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_insights WHERE business_id = v_business_id OR owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.marketplace_listings WHERE seller_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_compliance WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_contracts WHERE owner_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.user_subscriptions WHERE user_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.business_members WHERE business_id = v_business_id OR user_id = p_owner_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.businesses WHERE id = v_business_id OR created_by = p_owner_id; GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('businesses', v_count); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES ('business_deleted', CASE WHEN v_all THEN 'Biashara imefutwa kabisa' ELSE 'Sehemu ya biashara imefutwa' END, format('Admin %s amefuta data ya %s. Scope: %s', auth.uid()::text, v_expected_name, p_scope::text), jsonb_build_object('owner_id', p_owner_id, 'business_id', v_business_id, 'business_name', v_expected_name, 'scope', p_scope, 'deleted_counts', v_deleted, 'admin_id', auth.uid(), 'at', now()));
  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, auth.uid(), 'business', p_owner_id::text, CASE WHEN v_all THEN 'delete_full' ELSE 'delete_partial' END, format('Ufutaji wa biashara: %s', v_expected_name), jsonb_build_object('scope', p_scope, 'deleted_counts', v_deleted));
  RETURN json_build_object('success', true, 'deleted', v_deleted, 'all', v_all, 'business_id', v_business_id);
END;
$$;