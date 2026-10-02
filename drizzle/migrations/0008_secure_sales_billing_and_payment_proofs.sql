ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS proof_path text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_sale_id_unique ON public.invoices(sale_id) WHERE sale_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_reference_unique ON public.payment_transactions(provider_reference) WHERE provider_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.complete_scanner_sale(p_owner_id uuid,p_branch_id uuid,p_payment_method text,p_payment_details jsonb,p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale_id uuid; v_total numeric := 0; v_item jsonb; v_product public.products%ROWTYPE; v_qty numeric; v_price numeric; v_invoice_items jsonb := '[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_owner_data(p_owner_id) THEN RAISE EXCEPTION 'Huna ruhusa ya kukamilisha mauzo haya'; END IF;
 IF p_branch_id IS NOT NULL AND NOT public.can_access_branch(p_branch_id) THEN RAISE EXCEPTION 'Huna ruhusa ya tawi hili'; END IF;
 IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Hakuna bidhaa kwenye mauzo'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  v_qty := (v_item->>'quantity')::numeric; v_price := (v_item->>'unit_price')::numeric;
  IF v_qty <= 0 OR v_price < 0 THEN RAISE EXCEPTION 'Kiasi au bei si sahihi'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid AND owner_id=p_owner_id AND (p_branch_id IS NULL OR branch_id IS NULL OR branch_id=p_branch_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bidhaa haipatikani katika tawi hili'; END IF;
  IF coalesce(v_product.stock_quantity,0) < v_qty THEN RAISE EXCEPTION 'Stoku haitoshi kwa %', v_product.name; END IF;
  v_total := v_total + (v_qty*v_price);
  v_invoice_items := v_invoice_items || jsonb_build_array(jsonb_build_object('name',v_product.name,'quantity',v_qty,'unit_price',v_price,'subtotal',v_qty*v_price));
 END LOOP;
 INSERT INTO public.sales(owner_id,branch_id,created_by,total_amount,payment_method,payment_status,payment_details) VALUES (p_owner_id,p_branch_id,auth.uid(),v_total,p_payment_method,'paid',coalesce(p_payment_details,'{}'::jsonb)) RETURNING id INTO v_sale_id;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  v_qty := (v_item->>'quantity')::numeric; v_price := (v_item->>'unit_price')::numeric;
  INSERT INTO public.sales_items(sale_id,product_id,quantity,unit_price,subtotal) VALUES (v_sale_id,(v_item->>'product_id')::uuid,v_qty,v_price,v_qty*v_price);
  UPDATE public.products SET stock_quantity=stock_quantity-v_qty WHERE id=(v_item->>'product_id')::uuid AND owner_id=p_owner_id;
 END LOOP;
 INSERT INTO public.invoices(owner_id,branch_id,invoice_number,customer_name,items,total_amount,payment_method,status,sale_id) VALUES (p_owner_id,p_branch_id,'INV-'||upper(substr(v_sale_id::text,1,8)),'Mteja wa Kawaida',v_invoice_items,v_total,p_payment_method,'paid',v_sale_id);
 RETURN jsonb_build_object('sale_id',v_sale_id,'total',v_total);
END; $$;
REVOKE ALL ON FUNCTION public.complete_scanner_sale(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_scanner_sale(uuid,uuid,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_subscription_activation(p_reference text DEFAULT NULL,p_proof_path text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_subscription_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Ingia kwanza'; END IF;
 UPDATE public.user_subscriptions SET status='pending_approval',payment_reference=nullif(trim(p_reference),''),updated_at=now() WHERE user_id=auth.uid() RETURNING id INTO v_subscription_id;
 IF v_subscription_id IS NULL THEN RAISE EXCEPTION 'Mpango haujapatikana'; END IF;
 IF p_proof_path IS NOT NULL THEN UPDATE public.payment_transactions SET proof_path=p_proof_path,status='pending',updated_at=now() WHERE id=(p_reference)::uuid AND user_id=auth.uid(); END IF;
 INSERT INTO public.admin_notifications(notification_type,title,message,data) VALUES ('subscription_request','Ombi la Uthibitisho wa Malipo','Mmiliki ametuma ombi la uthibitisho wa malipo.',jsonb_build_object('user_id',auth.uid(),'subscription_id',v_subscription_id,'payment_reference',p_reference,'proof_path',p_proof_path));
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.request_subscription_activation(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_subscription_activation(text,text) TO authenticated;

DROP POLICY IF EXISTS "Users upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins view payment proofs" ON storage.objects;
CREATE POLICY "Users upload payment proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='payment-proofs' AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY "Users view payment proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='payment-proofs' AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY "Super admins view payment proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='payment-proofs' AND public.has_role(auth.uid(),'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload product images to own folder" ON storage.objects;
CREATE POLICY "Users upload product images to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='product-images' AND owner_id=auth.uid()::text AND ((storage.foldername(name))[1]=auth.uid()::text OR ((storage.foldername(name))[1]='ads' AND public.can_access_owner_data(((storage.foldername(name))[2])::uuid))));