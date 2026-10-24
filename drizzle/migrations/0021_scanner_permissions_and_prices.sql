CREATE OR REPLACE FUNCTION public.complete_scanner_sale(p_owner_id uuid,p_branch_id uuid,p_payment_method text,p_payment_details jsonb,p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_sale_id uuid; v_total numeric:=0; v_item jsonb; v_product public.products%ROWTYPE; v_qty numeric; v_price numeric; v_discount numeric; v_lines jsonb:='[]'::jsonb; v_all_qty numeric; v_override boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_owner_data(p_owner_id) OR NOT public.assistant_can(p_owner_id,'can_create_sales') OR NOT public.can_access_branch_data(p_owner_id,NULL,p_branch_id) THEN RAISE EXCEPTION 'Huna ruhusa ya kuuza hapa' USING ERRCODE='42501'; END IF;
 IF p_branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_branches WHERE id=p_branch_id AND owner_id=p_owner_id AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Tawi halipatikani' USING ERRCODE='42501'; END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Bidhaa si sahihi'; END IF;
 IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Hakuna bidhaa'; END IF;
 v_override:=public.assistant_can(p_owner_id,'sales_price_override');
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  v_qty:=(v_item->>'quantity')::numeric;
  IF v_qty IS NULL OR v_qty<=0 OR v_qty::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Kiasi si sahihi'; END IF;
 END LOOP;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id' LOOP
  v_qty:=(v_item->>'quantity')::numeric;
  SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid AND owner_id=p_owner_id FOR UPDATE;
  IF NOT FOUND OR v_product.is_archived IS TRUE OR (v_product.branch_id IS NOT NULL AND v_product.branch_id IS DISTINCT FROM p_branch_id) OR NOT public.can_access_branch_data(v_product.owner_id,v_product.business_id,v_product.branch_id) THEN RAISE EXCEPTION 'Bidhaa haipatikani katika tawi hili' USING ERRCODE='42501'; END IF;
  SELECT sum((value->>'quantity')::numeric) INTO v_all_qty FROM jsonb_array_elements(p_items) WHERE value->>'product_id'=v_item->>'product_id';
  IF coalesce(v_product.stock_quantity,0)<v_all_qty THEN RAISE EXCEPTION 'Stoo haitoshi'; END IF;
  SELECT coalesce(max(CASE discount_type WHEN 'percentage' THEN v_product.price*least(value,100)/100 WHEN 'fixed' THEN least(value,v_product.price) ELSE 0 END),0) INTO v_discount FROM public.discounts WHERE owner_id=p_owner_id AND active IS TRUE AND (start_date IS NULL OR start_date<=now()) AND (end_date IS NULL OR end_date>=now()) AND value>=0 AND (applicable_products IS NULL OR applicable_products='[]'::jsonb OR applicable_products @> jsonb_build_array(v_product.id::text));
  v_price:=CASE WHEN v_override AND v_item ? 'unit_price' THEN (v_item->>'unit_price')::numeric ELSE greatest(0,v_product.price-v_discount) END;
  IF v_price IS NULL OR v_price<0 OR v_price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Bei si sahihi'; END IF;
  v_total:=v_total+v_qty*v_price;
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'quantity',v_qty,'unit_price',v_price,'subtotal',v_qty*v_price));
 END LOOP;
 INSERT INTO public.sales(owner_id,branch_id,created_by,total_amount,payment_method,payment_status,payment_details) VALUES(p_owner_id,p_branch_id,auth.uid(),v_total,p_payment_method,'paid',coalesce(p_payment_details,'{}')) RETURNING id INTO v_sale_id;
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
  v_qty:=(v_item->>'quantity')::numeric; v_price:=(v_item->>'unit_price')::numeric;
  INSERT INTO public.sales_items(sale_id,product_id,quantity,unit_price,subtotal) VALUES(v_sale_id,(v_item->>'product_id')::uuid,v_qty,v_price,v_qty*v_price);
  UPDATE public.products SET stock_quantity=stock_quantity-v_qty WHERE id=(v_item->>'product_id')::uuid;
 END LOOP;
 INSERT INTO public.invoices(owner_id,branch_id,invoice_number,customer_name,items,total_amount,payment_method,status,sale_id) VALUES(p_owner_id,p_branch_id,'INV-'||v_sale_id::text,'Mteja wa Kawaida',v_lines,v_total,p_payment_method,'paid',v_sale_id);
 RETURN jsonb_build_object('sale_id',v_sale_id,'total',v_total);
END $$;
REVOKE ALL ON FUNCTION public.complete_scanner_sale(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_scanner_sale(uuid,uuid,text,jsonb,jsonb) TO authenticated;