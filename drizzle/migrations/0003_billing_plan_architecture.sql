CREATE TABLE IF NOT EXISTS public.billing_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  free_staff_limit integer NOT NULL DEFAULT 2,
  free_product_limit integer NOT NULL DEFAULT 20,
  free_customer_limit integer NOT NULL DEFAULT 10,
  base_fee numeric NOT NULL DEFAULT 30000,
  base_staff_limit integer NOT NULL DEFAULT 5,
  base_product_limit integer NOT NULL DEFAULT 100,
  base_customer_limit integer NOT NULL DEFAULT 200,
  branch_fee numeric NOT NULL DEFAULT 20000,
  branch_staff_limit integer NOT NULL DEFAULT 3,
  extra_staff_fee numeric NOT NULL DEFAULT 5000,
  extra_product_block integer NOT NULL DEFAULT 50,
  extra_product_block_fee numeric NOT NULL DEFAULT 5000,
  extra_customer_block integer NOT NULL DEFAULT 100,
  extra_customer_block_fee numeric NOT NULL DEFAULT 5000,
  sokoni_fee numeric NOT NULL DEFAULT 50000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.billing_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;
GRANT UPDATE ON public.billing_settings TO authenticated;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in reads billing settings" ON public.billing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin updates billing settings" ON public.billing_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS paid_entitlements jsonb;

CREATE OR REPLACE FUNCTION public.compute_business_billing(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s billing_settings%ROWTYPE;
  v_products int; v_customers int; v_hq_staff int; v_branches int;
  v_branch_extra_staff int := 0; v_has_sokoni boolean;
  v_extra_staff int; v_extra_prod_blocks int; v_extra_cust_blocks int;
  v_items jsonb := '[]'::jsonb; v_total numeric := 0; v_amt numeric;
BEGIN
  SELECT * INTO s FROM billing_settings WHERE id = 1;
  SELECT count(*) INTO v_products FROM products WHERE owner_id = p_owner_id AND COALESCE(is_archived,false) = false;
  SELECT count(*) INTO v_customers FROM customers WHERE owner_id = p_owner_id;
  SELECT 1 + count(*) INTO v_hq_staff FROM assistant_permissions WHERE owner_id = p_owner_id AND is_active = true;
  SELECT count(*) INTO v_branches FROM business_branches WHERE owner_id = p_owner_id AND is_active = true AND deleted_at IS NULL;
  SELECT COALESCE(sum(GREATEST(0, c - s.branch_staff_limit)),0) INTO v_branch_extra_staff FROM (
    SELECT count(bs.id) c FROM business_branches b JOIN branch_staff bs ON bs.branch_id = b.id AND bs.is_active
    WHERE b.owner_id = p_owner_id AND b.is_active AND b.deleted_at IS NULL GROUP BY b.id) x;
  SELECT COALESCE(bool_or(has_sokoni),false) INTO v_has_sokoni FROM user_subscriptions WHERE user_id = p_owner_id;

  v_items := v_items || jsonb_build_object('key','base','label',format('Duka kuu (wafanyakazi %s, bidhaa %s, wateja %s)', s.base_staff_limit, s.base_product_limit, s.base_customer_limit),'qty',1,'unit',s.base_fee,'amount',s.base_fee);
  v_total := s.base_fee;

  IF v_branches > 0 THEN
    v_amt := v_branches * s.branch_fee;
    v_items := v_items || jsonb_build_object('key','branches','label',format('Matawi (kila moja wafanyakazi %s)', s.branch_staff_limit),'qty',v_branches,'unit',s.branch_fee,'amount',v_amt);
    v_total := v_total + v_amt;
  END IF;

  v_extra_staff := GREATEST(0, v_hq_staff - s.base_staff_limit) + v_branch_extra_staff;
  IF v_extra_staff > 0 THEN
    v_amt := v_extra_staff * s.extra_staff_fee;
    v_items := v_items || jsonb_build_object('key','extra_staff','label','Wafanyakazi wa ziada','qty',v_extra_staff,'unit',s.extra_staff_fee,'amount',v_amt);
    v_total := v_total + v_amt;
  END IF;

  v_extra_prod_blocks := CEIL(GREATEST(0, v_products - s.base_product_limit)::numeric / s.extra_product_block);
  IF v_extra_prod_blocks > 0 THEN
    v_amt := v_extra_prod_blocks * s.extra_product_block_fee;
    v_items := v_items || jsonb_build_object('key','extra_products','label',format('Bidhaa za ziada (kila %s)', s.extra_product_block),'qty',v_extra_prod_blocks,'unit',s.extra_product_block_fee,'amount',v_amt);
    v_total := v_total + v_amt;
  END IF;

  v_extra_cust_blocks := CEIL(GREATEST(0, v_customers - s.base_customer_limit)::numeric / s.extra_customer_block);
  IF v_extra_cust_blocks > 0 THEN
    v_amt := v_extra_cust_blocks * s.extra_customer_block_fee;
    v_items := v_items || jsonb_build_object('key','extra_customers','label',format('Wateja wa ziada (kila %s)', s.extra_customer_block),'qty',v_extra_cust_blocks,'unit',s.extra_customer_block_fee,'amount',v_amt);
    v_total := v_total + v_amt;
  END IF;

  IF v_has_sokoni THEN
    v_items := v_items || jsonb_build_object('key','sokoni','label','Sokoni Marketplace','qty',1,'unit',s.sokoni_fee,'amount',s.sokoni_fee);
    v_total := v_total + s.sokoni_fee;
  END IF;

  RETURN jsonb_build_object(
    'usage', jsonb_build_object('products',v_products,'customers',v_customers,'hq_staff',v_hq_staff,'branches',v_branches,'branch_extra_staff',v_branch_extra_staff),
    'free_limits', jsonb_build_object('staff',s.free_staff_limit,'products',s.free_product_limit,'customers',s.free_customer_limit),
    'paid_limits', jsonb_build_object(
      'staff', s.base_staff_limit + v_branches * s.branch_staff_limit,
      'products', s.base_product_limit + v_extra_prod_blocks * s.extra_product_block,
      'customers', s.base_customer_limit + v_extra_cust_blocks * s.extra_customer_block,
      'branches', v_branches),
    'items', v_items,
    'total', v_total);
END $$;

CREATE OR REPLACE FUNCTION public.calculate_subscription_fee()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  v := public.compute_business_billing(NEW.user_id);
  NEW.calculated_fee := (v->>'total')::numeric;
  NEW.fee_breakdown := v;
  NEW.branch_count := (v->'usage'->>'branches')::int;
  NEW.assistant_count := GREATEST(0, (v->'usage'->>'hq_staff')::int - 1);
  NEW.payment_amount := COALESCE(NEW.custom_fee, NEW.calculated_fee);
  RETURN NEW;
END $$;

-- Current user's live bill (also refreshes stored amount)
CREATE OR REPLACE FUNCTION public.get_my_billing()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid := auth.uid(); v jsonb; v_sub user_subscriptions%ROWTYPE;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE user_subscriptions SET updated_at = now() WHERE user_id = v_owner;
  SELECT * INTO v_sub FROM user_subscriptions WHERE user_id = v_owner ORDER BY created_at DESC LIMIT 1;
  v := compute_business_billing(v_owner);
  RETURN v || jsonb_build_object(
    'is_paid', v_sub.status = 'active' AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end > now()),
    'status', v_sub.status,
    'amount_due', COALESCE(v_sub.custom_fee, (v->>'total')::numeric),
    'paid_entitlements', v_sub.paid_entitlements);
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_billing() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_business_billing(uuid) FROM anon;

-- On approval, snapshot exactly what was paid for
CREATE OR REPLACE FUNCTION public.snapshot_paid_entitlements()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active' OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end) THEN
    NEW.paid_entitlements := jsonb_build_object('limits', NEW.fee_breakdown->'paid_limits', 'items', NEW.fee_breakdown->'items', 'amount', NEW.payment_amount, 'paid_at', now(), 'valid_until', NEW.current_period_end);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_snapshot_paid_entitlements ON public.user_subscriptions;
CREATE TRIGGER trg_snapshot_paid_entitlements BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_paid_entitlements();

-- Free plan limits enforcement
CREATE OR REPLACE FUNCTION public.enforce_free_plan_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s billing_settings%ROWTYPE; v_owner uuid; v_paid boolean; v_count int;
BEGIN
  v_owner := NEW.owner_id;
  IF v_owner IS NULL OR has_role(v_owner,'super_admin') THEN RETURN NEW; END IF;
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = v_owner AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())) INTO v_paid;
  IF v_paid THEN RETURN NEW; END IF;
  SELECT * INTO s FROM billing_settings WHERE id = 1;
  IF TG_TABLE_NAME = 'products' THEN
    SELECT count(*) INTO v_count FROM products WHERE owner_id = v_owner AND COALESCE(is_archived,false) = false;
    IF v_count >= s.free_product_limit THEN
      RAISE EXCEPTION 'Mpango wa bure una kikomo cha bidhaa %. Lipia mpango ili kuongeza zaidi.', s.free_product_limit;
    END IF;
  ELSIF TG_TABLE_NAME = 'customers' THEN
    SELECT count(*) INTO v_count FROM customers WHERE owner_id = v_owner;
    IF v_count >= s.free_customer_limit THEN
      RAISE EXCEPTION 'Mpango wa bure una kikomo cha wateja %. Lipia mpango ili kuongeza zaidi.', s.free_customer_limit;
    END IF;
  ELSIF TG_TABLE_NAME = 'assistant_permissions' THEN
    SELECT 1 + count(*) INTO v_count FROM assistant_permissions WHERE owner_id = v_owner AND is_active;
    IF v_count >= s.free_staff_limit THEN
      RAISE EXCEPTION 'Mpango wa bure unaruhusu wafanyakazi % tu (pamoja na mwenye duka). Lipia mpango ili kuongeza.', s.free_staff_limit;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_free_limit_products ON public.products;
CREATE TRIGGER trg_free_limit_products BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_limits();
DROP TRIGGER IF EXISTS trg_free_limit_customers ON public.customers;
CREATE TRIGGER trg_free_limit_customers BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_limits();
DROP TRIGGER IF EXISTS trg_free_limit_assistants ON public.assistant_permissions;
CREATE TRIGGER trg_free_limit_assistants BEFORE INSERT ON public.assistant_permissions FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_limits();

-- Owner-uploaded official Lipa Namba QR
ALTER TABLE public.owner_payment_numbers ADD COLUMN IF NOT EXISTS qr_image_url text;