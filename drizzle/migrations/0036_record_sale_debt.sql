CREATE OR REPLACE FUNCTION public.record_sale_debt(p_sale_id uuid, p_customer_id uuid, p_customer_name text, p_customer_phone text, p_amount_paid numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; v_cust uuid := p_customer_id; v_paid numeric; v_debt numeric; v_name text; v_status text;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mauzo hayapatikani'; END IF;
  IF auth.uid() IS NULL OR NOT public.can_access_owner_data(s.owner_id) THEN RAISE EXCEPTION 'Hakuna ruhusa' USING ERRCODE='42501'; END IF;
  IF auth.uid() <> s.owner_id AND NOT public.assistant_can(s.owner_id,'can_create_sales') THEN RAISE EXCEPTION 'Huna ruhusa ya kuuza' USING ERRCODE='42501'; END IF;
  IF s.created_at < now() - interval '1 hour' THEN RAISE EXCEPTION 'Mauzo haya ni ya zamani'; END IF;
  IF coalesce(s.payment_details->>'debt_recorded','') = 'true' THEN RETURN jsonb_build_object('ok',true,'already',true); END IF;
  v_paid := greatest(0, least(coalesce(p_amount_paid,0), s.total_amount));
  v_debt := s.total_amount - v_paid;
  IF v_debt <= 0 THEN RETURN jsonb_build_object('ok',true,'debt',0); END IF;

  IF v_cust IS NULL THEN
    v_name := nullif(btrim(coalesce(p_customer_name,'')),'');
    IF v_name IS NULL THEN RAISE EXCEPTION 'Weka jina la mteja anayedaiwa'; END IF;
    SELECT id INTO v_cust FROM public.customers WHERE owner_id = s.owner_id AND lower(name) = lower(v_name)
      AND (nullif(btrim(coalesce(p_customer_phone,'')),'') IS NULL OR phone = btrim(p_customer_phone)) LIMIT 1;
    IF v_cust IS NULL THEN
      INSERT INTO public.customers(owner_id, branch_id, name, phone)
      VALUES (s.owner_id, s.branch_id, left(v_name,120), nullif(left(btrim(coalesce(p_customer_phone,'')),20),''))
      RETURNING id INTO v_cust;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_cust AND owner_id = s.owner_id) THEN
    RAISE EXCEPTION 'Mteja hapatikani' USING ERRCODE='42501';
  END IF;
  SELECT name INTO v_name FROM public.customers WHERE id = v_cust;
  v_status := CASE WHEN v_paid > 0 THEN 'partial' ELSE 'unpaid' END;

  UPDATE public.sales SET customer_id = v_cust, payment_status = v_status,
    payment_details = coalesce(payment_details,'{}'::jsonb) || jsonb_build_object('amount_paid',v_paid,'balance',v_debt,'debt_recorded',true)
    WHERE id = p_sale_id;
  UPDATE public.invoices SET status = v_status, customer_name = v_name WHERE sale_id = p_sale_id;

  PERFORM set_config('kiduka.sale_effects','on',true);
  UPDATE public.customers SET outstanding_balance = coalesce(outstanding_balance,0) + v_debt WHERE id = v_cust;
  PERFORM set_config('kiduka.sale_effects','off',true);

  INSERT INTO public.customer_transactions(owner_id, branch_id, customer_id, customer_name, transaction_type, total_amount, amount_paid, balance, payment_status, payment_method, notes)
  VALUES (s.owner_id, s.branch_id, v_cust, v_name, 'sale', s.total_amount, v_paid, v_debt, v_status, coalesce(s.payment_method,'credit'), 'Deni la mauzo INV-' || left(p_sale_id::text,8));

  RETURN jsonb_build_object('ok',true,'customer_id',v_cust,'debt',v_debt);
END $$;
REVOKE ALL ON FUNCTION public.record_sale_debt(uuid,uuid,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale_debt(uuid,uuid,text,text,numeric) TO authenticated, service_role;