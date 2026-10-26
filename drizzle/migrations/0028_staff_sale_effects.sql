DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.guard_assistant_action()'::regprocedure);
  d := replace(d, $q$AND NOT public.assistant_can(owner,'debts_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya deni'$q$,
                  $q$AND current_setting('kiduka.sale_effects',true) IS DISTINCT FROM 'on' AND NOT public.assistant_can(owner,'debts_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya deni'$q$);
  EXECUTE d;
END $$;

CREATE OR REPLACE FUNCTION public.apply_staff_sale_effects(p_sale_id uuid, p_customer_id uuid, p_debt numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; it record;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mauzo hayapatikani'; END IF;
  IF NOT public.can_access_owner_data(s.owner_id) THEN RAISE EXCEPTION 'Hakuna ruhusa' USING ERRCODE='42501'; END IF;
  IF auth.uid() <> s.owner_id AND NOT public.assistant_can(s.owner_id,'can_create_sales') THEN
    RAISE EXCEPTION 'Huna ruhusa ya kuuza' USING ERRCODE='42501'; END IF;
  IF coalesce(s.payment_details->>'effects_applied','') = 'true' THEN RETURN jsonb_build_object('ok',true,'already',true); END IF;
  FOR it IN SELECT product_id, sum(quantity) q FROM public.sales_items WHERE sale_id = p_sale_id AND product_id IS NOT NULL GROUP BY product_id LOOP
    UPDATE public.products SET stock_quantity = greatest(0, coalesce(stock_quantity,0) - it.q)
      WHERE id = it.product_id AND owner_id = s.owner_id;
  END LOOP;
  IF p_customer_id IS NOT NULL AND coalesce(p_debt,0) > 0 THEN
    PERFORM set_config('kiduka.sale_effects','on',true);
    UPDATE public.customers SET outstanding_balance = coalesce(outstanding_balance,0) + least(p_debt, s.total_amount)
      WHERE id = p_customer_id AND owner_id = s.owner_id;
    PERFORM set_config('kiduka.sale_effects','off',true);
  END IF;
  UPDATE public.sales SET payment_details = coalesce(payment_details,'{}'::jsonb) || '{"effects_applied":true}'::jsonb WHERE id = p_sale_id;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.apply_staff_sale_effects(uuid,uuid,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_staff_sale_effects(uuid,uuid,numeric) TO authenticated;