ALTER TABLE public.billing_settings
  ADD COLUMN IF NOT EXISTS large_business_product_threshold int NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS branch_fee_small numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS branch_fee_large numeric NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS extra_staff_fee_small numeric NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS extra_staff_fee_large numeric NOT NULL DEFAULT 500;
COMMENT ON COLUMN public.billing_settings.branch_fee IS 'DEPRECATED: replaced by branch_fee_small/branch_fee_large';
COMMENT ON COLUMN public.billing_settings.extra_staff_fee IS 'DEPRECATED: replaced by extra_staff_fee_small/extra_staff_fee_large';

CREATE OR REPLACE FUNCTION public.compute_business_billing(p_owner_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s billing_settings%ROWTYPE;
  v_products int; v_customers int; v_hq_staff int; v_branches int;
  v_branch_extra_staff int := 0; v_has_sokoni boolean; v_large boolean;
  v_branch_fee numeric; v_staff_fee numeric;
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

  v_large := v_products >= s.large_business_product_threshold;
  v_branch_fee := CASE WHEN v_large THEN s.branch_fee_large ELSE s.branch_fee_small END;
  v_staff_fee := CASE WHEN v_large THEN s.extra_staff_fee_large ELSE s.extra_staff_fee_small END;

  v_items := v_items || jsonb_build_object('key','base','label',format('Duka kuu (wafanyakazi %s, bidhaa %s, wateja %s)', s.base_staff_limit, s.base_product_limit, s.base_customer_limit),'qty',1,'unit',s.base_fee,'amount',s.base_fee);
  v_total := s.base_fee;

  IF v_branches > 0 THEN
    v_amt := v_branches * v_branch_fee;
    v_items := v_items || jsonb_build_object('key','branches','label',format('Matawi — biashara %s (kila tawi wafanyakazi %s)', CASE WHEN v_large THEN 'kubwa' ELSE 'ndogo' END, s.branch_staff_limit),'qty',v_branches,'unit',v_branch_fee,'amount',v_amt);
    v_total := v_total + v_amt;
  END IF;

  v_extra_staff := GREATEST(0, v_hq_staff - s.base_staff_limit) + v_branch_extra_staff;
  IF v_extra_staff > 0 THEN
    v_amt := v_extra_staff * v_staff_fee;
    v_items := v_items || jsonb_build_object('key','extra_staff','label','Wafanyakazi wa ziada','qty',v_extra_staff,'unit',v_staff_fee,'amount',v_amt);
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
    'usage', jsonb_build_object('products',v_products,'customers',v_customers,'hq_staff',v_hq_staff,'branches',v_branches,'branch_extra_staff',v_branch_extra_staff,'business_size',CASE WHEN v_large THEN 'large' ELSE 'small' END),
    'free_limits', jsonb_build_object('staff',s.free_staff_limit,'products',s.free_product_limit,'customers',s.free_customer_limit),
    'paid_limits', jsonb_build_object(
      'staff', s.base_staff_limit + v_branches * s.branch_staff_limit,
      'products', s.base_product_limit + v_extra_prod_blocks * s.extra_product_block,
      'customers', s.base_customer_limit + v_extra_cust_blocks * s.extra_customer_block,
      'branches', v_branches),
    'items', v_items,
    'total', v_total);
END $function$;