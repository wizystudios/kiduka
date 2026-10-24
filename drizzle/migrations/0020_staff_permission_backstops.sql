CREATE OR REPLACE FUNCTION public.assistant_can(p_owner_id uuid,p_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (auth.uid()=p_owner_id OR public.has_role(auth.uid(),'super_admin') OR EXISTS(SELECT 1 FROM public.assistant_permissions ap WHERE ap.owner_id=p_owner_id AND ap.assistant_id=auth.uid() AND ap.is_active IS TRUE AND CASE WHEN p_key LIKE 'can\_%' THEN to_jsonb(ap)->p_key='true'::jsonb ELSE ap.extra_permissions->p_key='true'::jsonb END)) $$;
REVOKE ALL ON FUNCTION public.assistant_can(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assistant_can(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.staff_any_permission(p_owner uuid,p_keys text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM unnest(p_keys) k WHERE public.assistant_can(p_owner,k)) $$;
REVOKE ALL ON FUNCTION public.staff_any_permission(uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_any_permission(uuid,text[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_access_branch_data(_owner_id uuid,_business_id uuid,_branch_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT auth.uid() IS NOT NULL AND (auth.uid()=_owner_id OR public.has_role(auth.uid(),'super_admin') OR (
 EXISTS(SELECT 1 FROM public.assistant_permissions ap WHERE ap.owner_id=_owner_id AND ap.assistant_id=auth.uid() AND ap.is_active IS TRUE)
 AND (_business_id IS NULL OR EXISTS(SELECT 1 FROM public.business_members ob WHERE ob.user_id=_owner_id AND ob.business_id=_business_id AND ob.role='owner' AND ob.is_active))
 AND (EXISTS(SELECT 1 FROM public.branch_staff bs JOIN public.business_branches bb ON bb.id=bs.branch_id WHERE bs.user_id=auth.uid() AND bs.is_active AND bb.owner_id=_owner_id AND bb.is_active AND bb.deleted_at IS NULL AND bs.branch_id=_branch_id)
 OR EXISTS(SELECT 1 FROM public.business_members bm JOIN public.business_members ob ON ob.business_id=bm.business_id AND ob.user_id=_owner_id AND ob.role='owner' AND ob.is_active WHERE bm.user_id=auth.uid() AND bm.is_active AND bm.branch_id IS NOT NULL AND bm.branch_id=_branch_id AND (_business_id IS NULL OR bm.business_id=_business_id))
 OR (_branch_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.branch_staff bs JOIN public.business_branches bb ON bb.id=bs.branch_id WHERE bs.user_id=auth.uid() AND bs.is_active AND bb.owner_id=_owner_id) AND NOT EXISTS(SELECT 1 FROM public.business_members bm JOIN public.business_members ob ON ob.business_id=bm.business_id AND ob.user_id=_owner_id AND ob.role='owner' WHERE bm.user_id=auth.uid() AND bm.is_active AND bm.branch_id IS NOT NULL))
 ))) $$;
DO $$ DECLARE r record; op text; pred text; keys text[]; BEGIN
FOR r IN SELECT * FROM (VALUES
('products',ARRAY['can_view_products','can_create_sales','can_view_inventory','can_view_reports','products_create','can_edit_products'],ARRAY['products_create','products_import'],ARRAY['can_edit_products','products_archive','can_edit_inventory','inventory_automation'],ARRAY['can_delete_products']),
('customers',ARRAY['can_view_customers','can_create_sales','debts_manage','loans_manage','groups_manage','loyalty_manage','can_view_reports','whatsapp_send'],ARRAY['can_edit_customers'],ARRAY['can_edit_customers','debts_manage','loyalty_manage'],ARRAY['customers_delete']),
('sales',ARRAY['can_view_sales','can_view_reports','invoices_view','analytics_view','profit_view'],ARRAY['can_create_sales'],ARRAY['invoices_edit'],ARRAY['invoices_delete']),
('invoices',ARRAY['invoices_view'],ARRAY['can_create_sales'],ARRAY['invoices_edit'],ARRAY['invoices_delete']),
('expenses',ARRAY['expenses_manage','profit_view','bookkeeping_view'],ARRAY['expenses_manage'],ARRAY['expenses_delete'],ARRAY['expenses_delete']),
('inventory_movements',ARRAY['can_view_inventory'],ARRAY['can_edit_inventory','inventory_automation','returns_approve'],ARRAY['can_edit_inventory'],ARRAY['can_edit_inventory'])
) v(t,rk,ik,uk,dk) LOOP
 FOREACH op IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
 keys:=CASE op WHEN 'SELECT' THEN r.rk WHEN 'INSERT' THEN r.ik WHEN 'UPDATE' THEN r.uk ELSE r.dk END;
 pred:=format('public.can_access_branch_data(owner_id,business_id,branch_id) AND public.staff_any_permission(owner_id,%L::text[])',keys);
 EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s','Catalog '||lower(op),r.t,op,CASE WHEN op='INSERT' THEN 'WITH CHECK ('||pred||')' WHEN op='UPDATE' THEN 'USING ('||pred||') WITH CHECK ('||pred||')' ELSE 'USING ('||pred||')' END);
 END LOOP;
END LOOP;
FOR r IN SELECT * FROM (VALUES ('discounts','discounts_manage','discounts_manage'),('suppliers','suppliers_manage','suppliers_manage'),('purchase_orders','suppliers_manage','suppliers_manage'),('micro_loans','loans_manage','loans_manage'),('income_records','bookkeeping_view','bookkeeping_write'),('journal_entries','bookkeeping_view','bookkeeping_write'),('whatsapp_messages','whatsapp_send','whatsapp_send'),('scheduled_whatsapp_messages','whatsapp_send','whatsapp_send'),('business_compliance','compliance_manage','compliance_manage'),('business_ads','ads_manage','ads_manage')) v(t,rk,wk) LOOP
 EXECUTE format('CREATE POLICY "Catalog all" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.can_access_branch_data(owner_id,NULL,NULL) AND public.assistant_can(owner_id,%L)) WITH CHECK (public.can_access_branch_data(owner_id,NULL,NULL) AND public.assistant_can(owner_id,%L))',r.t,r.rk,r.wk);
END LOOP;
END $$;
CREATE POLICY "Catalog parent sale" ON public.sales_items AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id AND public.can_access_branch_data(s.owner_id,s.business_id,s.branch_id) AND public.staff_any_permission(s.owner_id,ARRAY['can_view_sales','invoices_view','can_view_reports','analytics_view','profit_view']))) WITH CHECK(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id AND public.can_access_branch_data(s.owner_id,s.business_id,s.branch_id) AND public.assistant_can(s.owner_id,'can_create_sales')));
CREATE POLICY "Catalog parent journal" ON public.journal_lines AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.id=entry_id AND public.assistant_can(j.owner_id,'bookkeeping_view'))) WITH CHECK(EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.id=entry_id AND public.assistant_can(j.owner_id,'bookkeeping_write')));
CREATE POLICY "Catalog parent loan" ON public.loan_payments AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.micro_loans l WHERE l.id=loan_id AND public.assistant_can(l.owner_id,'loans_manage'))) WITH CHECK(EXISTS(SELECT 1 FROM public.micro_loans l WHERE l.id=loan_id AND public.assistant_can(l.owner_id,'loans_manage')));
CREATE POLICY "Catalog parent snapshot" ON public.inventory_snapshots AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.owner_id=inventory_snapshots.owner_id AND public.can_access_branch_data(p.owner_id,p.business_id,p.branch_id) AND public.assistant_can(p.owner_id,'can_view_inventory'))) WITH CHECK(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.owner_id=inventory_snapshots.owner_id AND public.can_access_branch_data(p.owner_id,p.business_id,p.branch_id) AND public.assistant_can(p.owner_id,'inventory_snapshot_create')));
CREATE POLICY "Catalog order reads" ON public.sokoni_orders AS RESTRICTIVE FOR SELECT TO authenticated USING(public.can_access_branch_data(seller_id,business_id,NULL) AND public.assistant_can(seller_id,'sokoni_orders_manage'));
CREATE POLICY "Catalog order changes" ON public.sokoni_orders AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.can_access_branch_data(seller_id,business_id,NULL) AND public.assistant_can(seller_id,'sokoni_orders_manage')) WITH CHECK(public.can_access_branch_data(seller_id,business_id,NULL) AND public.assistant_can(seller_id,'sokoni_orders_manage'));
CREATE POLICY "Catalog return reads" ON public.return_requests AS RESTRICTIVE FOR SELECT TO authenticated USING(public.can_access_branch_data(seller_id,NULL,NULL) AND public.assistant_can(seller_id,'returns_view'));
CREATE POLICY "Catalog return changes" ON public.return_requests AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.can_access_branch_data(seller_id,NULL,NULL) AND public.staff_any_permission(seller_id,ARRAY['returns_approve','returns_reject','returns_refund'])) WITH CHECK(public.can_access_branch_data(seller_id,NULL,NULL) AND public.staff_any_permission(seller_id,ARRAY['returns_approve','returns_reject','returns_refund']));
CREATE OR REPLACE FUNCTION public.guard_assistant_action() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE o jsonb; n jsonb; owner uuid; k text; BEGIN
 o:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END; n:=CASE WHEN TG_OP='DELETE' THEN o ELSE to_jsonb(NEW) END;
 owner:=COALESCE(o->>'owner_id',o->>'seller_id',n->>'owner_id',n->>'seller_id')::uuid;
 IF auth.uid()=owner OR public.has_role(auth.uid(),'super_admin') THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 IF auth.uid() IS NULL THEN IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF; RAISE EXCEPTION 'Ingia kwanza' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (o->'owner_id' IS DISTINCT FROM n->'owner_id' OR o->'business_id' IS DISTINCT FROM n->'business_id' OR o->'branch_id' IS DISTINCT FROM n->'branch_id' OR o->'seller_id' IS DISTINCT FROM n->'seller_id') THEN RAISE EXCEPTION 'Huwezi kuhamisha rekodi' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='products' AND TG_OP='UPDATE' THEN
 IF (o->'is_archived' IS DISTINCT FROM n->'is_archived' OR o->'archived_at' IS DISTINCT FROM n->'archived_at' OR o->'archived_by' IS DISTINCT FROM n->'archived_by') AND NOT public.staff_any_permission(owner,ARRAY['products_archive','can_delete_products']) THEN RAISE EXCEPTION 'Huna ruhusa ya kuhifadhi bidhaa' USING ERRCODE='42501'; END IF;
 IF o->'cost_price' IS DISTINCT FROM n->'cost_price' AND NOT public.assistant_can(owner,'products_cost_edit') THEN RAISE EXCEPTION 'Huna ruhusa ya gharama' USING ERRCODE='42501'; END IF;
 IF o->'price' IS DISTINCT FROM n->'price' AND NOT public.assistant_can(owner,'products_price_edit') THEN RAISE EXCEPTION 'Huna ruhusa ya bei' USING ERRCODE='42501'; END IF;
 IF o->'stock_quantity' IS DISTINCT FROM n->'stock_quantity' AND current_user NOT IN ('postgres','service_role','supabase_admin') AND NOT public.staff_any_permission(owner,ARRAY['can_edit_inventory','inventory_automation','returns_approve']) THEN RAISE EXCEPTION 'Huna ruhusa ya stoo' USING ERRCODE='42501'; END IF;
 ELSIF TG_TABLE_NAME='customers' AND TG_OP='UPDATE' AND o->'outstanding_balance' IS DISTINCT FROM n->'outstanding_balance' AND NOT public.assistant_can(owner,'debts_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya deni' USING ERRCODE='42501';
 ELSIF TG_TABLE_NAME='return_requests' THEN k:=CASE n->>'status' WHEN 'approved' THEN 'returns_approve' WHEN 'rejected' THEN 'returns_reject' WHEN 'completed' THEN 'returns_refund' ELSE 'returns_view' END; IF NOT public.assistant_can(owner,k) THEN RAISE EXCEPTION 'Huna ruhusa ya marejesho' USING ERRCODE='42501'; END IF;
 END IF;
 k:=CASE WHEN TG_OP='DELETE' THEN TG_ARGV[1] ELSE TG_ARGV[0] END;
 IF k IS NOT NULL AND k<>'' AND NOT public.assistant_can(owner,k) THEN RAISE EXCEPTION 'Huna ruhusa ya kitendo hiki' USING ERRCODE='42501'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END $$;
DROP TRIGGER IF EXISTS guard_assistant_products ON public.products;
CREATE TRIGGER guard_assistant_products BEFORE UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('','can_delete_products');
DROP TRIGGER IF EXISTS guard_assistant_customers ON public.customers;
CREATE TRIGGER guard_assistant_customers BEFORE UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('','customers_delete');
CREATE TRIGGER guard_assistant_returns BEFORE UPDATE ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('','');