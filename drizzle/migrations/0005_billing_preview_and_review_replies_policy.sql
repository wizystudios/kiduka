CREATE OR REPLACE FUNCTION public.preview_business_billing(p_staff int, p_products int, p_customers int, p_branches int, p_branch_staff int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s billing_settings%ROWTYPE; v_total numeric; v_items jsonb := '[]'::jsonb;
  v_extra_staff int; v_pb int; v_cb int; v_free boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO s FROM billing_settings WHERE id = 1;
  p_staff := GREATEST(1, COALESCE(p_staff,1)); p_products := GREATEST(0, COALESCE(p_products,0));
  p_customers := GREATEST(0, COALESCE(p_customers,0)); p_branches := GREATEST(0, COALESCE(p_branches,0));
  p_branch_staff := GREATEST(0, COALESCE(p_branch_staff,0));
  v_free := p_branches = 0 AND p_staff <= s.free_staff_limit AND p_products <= s.free_product_limit AND p_customers <= s.free_customer_limit;
  IF v_free THEN
    RETURN jsonb_build_object('plan','free','total',0,'items',v_items);
  END IF;
  v_items := v_items || jsonb_build_object('key','base','label','Duka kuu','qty',1,'unit',s.base_fee,'amount',s.base_fee);
  v_total := s.base_fee;
  IF p_branches > 0 THEN
    v_items := v_items || jsonb_build_object('key','branches','label','Matawi','qty',p_branches,'unit',s.branch_fee,'amount',p_branches*s.branch_fee);
    v_total := v_total + p_branches*s.branch_fee;
  END IF;
  v_extra_staff := GREATEST(0, p_staff - s.base_staff_limit) + GREATEST(0, p_branch_staff - p_branches*s.branch_staff_limit);
  IF v_extra_staff > 0 THEN
    v_items := v_items || jsonb_build_object('key','extra_staff','label','Wafanyakazi wa ziada','qty',v_extra_staff,'unit',s.extra_staff_fee,'amount',v_extra_staff*s.extra_staff_fee);
    v_total := v_total + v_extra_staff*s.extra_staff_fee;
  END IF;
  v_pb := CEIL(GREATEST(0, p_products - s.base_product_limit)::numeric / s.extra_product_block);
  IF v_pb > 0 THEN
    v_items := v_items || jsonb_build_object('key','extra_products','label',format('Bidhaa za ziada (kila %s)', s.extra_product_block),'qty',v_pb,'unit',s.extra_product_block_fee,'amount',v_pb*s.extra_product_block_fee);
    v_total := v_total + v_pb*s.extra_product_block_fee;
  END IF;
  v_cb := CEIL(GREATEST(0, p_customers - s.base_customer_limit)::numeric / s.extra_customer_block);
  IF v_cb > 0 THEN
    v_items := v_items || jsonb_build_object('key','extra_customers','label',format('Wateja wa ziada (kila %s)', s.extra_customer_block),'qty',v_cb,'unit',s.extra_customer_block_fee,'amount',v_cb*s.extra_customer_block_fee);
    v_total := v_total + v_cb*s.extra_customer_block_fee;
  END IF;
  RETURN jsonb_build_object('plan','paid','total',v_total,'items',v_items);
END $$;
REVOKE EXECUTE ON FUNCTION public.preview_business_billing(int,int,int,int,int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.preview_business_billing(int,int,int,int,int) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view review replies" ON public.review_replies;
CREATE POLICY "Public can view replies from the product seller" ON public.review_replies
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.product_reviews r JOIN public.products p ON p.id = r.product_id
  WHERE r.id = review_replies.review_id AND p.owner_id = review_replies.seller_id
));