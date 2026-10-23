CREATE OR REPLACE FUNCTION public.preview_business_billing(p_staff integer, p_products integer, p_customers integer, p_branches integer, p_branch_staff integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE s billing_settings%ROWTYPE; v_total numeric; v_items jsonb := '[]'::jsonb; v_extra_staff integer; v_pb integer; v_cb integer; v_staff_fee numeric; v_branch_fee numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO s FROM billing_settings WHERE id=1;
 p_staff:=greatest(1,coalesce(p_staff,1)); p_products:=greatest(0,coalesce(p_products,0)); p_customers:=greatest(0,coalesce(p_customers,0)); p_branches:=greatest(0,coalesce(p_branches,0)); p_branch_staff:=greatest(0,coalesce(p_branch_staff,0));
 IF p_branches=0 AND p_staff<=s.free_staff_limit AND p_products<=s.free_product_limit AND p_customers<=s.free_customer_limit THEN RETURN jsonb_build_object('plan','free','total',0,'items',v_items); END IF;
 v_staff_fee:=CASE WHEN p_products>=s.large_business_product_threshold THEN s.extra_staff_fee_large ELSE s.extra_staff_fee_small END;
 v_branch_fee:=CASE WHEN p_products>=s.large_business_product_threshold THEN s.branch_fee_large ELSE s.branch_fee_small END;
 v_total:=s.base_fee;
 v_items:=v_items||jsonb_build_object('key','base','label','Duka kuu','qty',1,'unit',s.base_fee,'amount',s.base_fee);
 IF p_branches>0 THEN v_items:=v_items||jsonb_build_object('key','branches','label','Matawi','qty',p_branches,'unit',v_branch_fee,'amount',p_branches*v_branch_fee); v_total:=v_total+p_branches*v_branch_fee; END IF;
 v_extra_staff:=greatest(0,p_staff-s.base_staff_limit)+greatest(0,p_branch_staff-p_branches*s.branch_staff_limit);
 IF v_extra_staff>0 THEN v_items:=v_items||jsonb_build_object('key','extra_staff','label','Wafanyakazi wa ziada','qty',v_extra_staff,'unit',v_staff_fee,'amount',v_extra_staff*v_staff_fee); v_total:=v_total+v_extra_staff*v_staff_fee; END IF;
 v_pb:=ceil(greatest(0,p_products-s.base_product_limit)::numeric/s.extra_product_block); v_cb:=ceil(greatest(0,p_customers-s.base_customer_limit)::numeric/s.extra_customer_block);
 IF v_pb>0 THEN v_items:=v_items||jsonb_build_object('key','extra_products','label','Bidhaa za ziada','qty',v_pb,'unit',s.extra_product_block_fee,'amount',v_pb*s.extra_product_block_fee); v_total:=v_total+v_pb*s.extra_product_block_fee; END IF;
 IF v_cb>0 THEN v_items:=v_items||jsonb_build_object('key','extra_customers','label','Wateja wa ziada','qty',v_cb,'unit',s.extra_customer_block_fee,'amount',v_cb*s.extra_customer_block_fee); v_total:=v_total+v_cb*s.extra_customer_block_fee; END IF;
 RETURN jsonb_build_object('plan','paid','total',v_total,'items',v_items);
END $$;
GRANT EXECUTE ON FUNCTION public.preview_business_billing(integer,integer,integer,integer,integer) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_public_billing_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT jsonb_build_object('base_fee',base_fee,'base_staff_limit',base_staff_limit,'base_product_limit',base_product_limit,'base_customer_limit',base_customer_limit,'free_staff_limit',free_staff_limit,'free_product_limit',free_product_limit,'free_customer_limit',free_customer_limit,'branch_staff_limit',branch_staff_limit,'large_business_product_threshold',large_business_product_threshold,'branch_fee_small',branch_fee_small,'branch_fee_large',branch_fee_large,'extra_staff_fee_small',extra_staff_fee_small,'extra_staff_fee_large',extra_staff_fee_large,'extra_product_block',extra_product_block,'extra_product_block_fee',extra_product_block_fee,'extra_customer_block',extra_customer_block,'extra_customer_block_fee',extra_customer_block_fee,'sokoni_fee',sokoni_fee) FROM billing_settings WHERE id=1 $$;
GRANT EXECUTE ON FUNCTION public.get_public_billing_settings() TO anon, authenticated, service_role;