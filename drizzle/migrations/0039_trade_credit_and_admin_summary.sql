ALTER TABLE public.customer_transactions ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;
UPDATE public.customer_transactions t SET sale_id=s.id FROM public.sales s WHERE t.sale_id IS NULL AND t.transaction_type='sale' AND t.owner_id=s.owner_id AND t.customer_id=s.customer_id AND t.branch_id IS NOT DISTINCT FROM s.branch_id AND t.notes='Deni la mauzo INV-'||left(s.id::text,8) AND s.payment_details->>'debt_recorded'='true' AND NOT EXISTS(SELECT 1 FROM public.sales x WHERE x.id<>s.id AND x.owner_id=s.owner_id AND left(x.id::text,8)=left(s.id::text,8));
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.business_branches(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS purchase_kind text NOT NULL DEFAULT 'goods' CHECK(purchase_kind IN ('goods','service'));
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id);
CREATE TABLE public.trade_payments(id uuid PRIMARY KEY, owner_id uuid NOT NULL, branch_id uuid, customer_id uuid REFERENCES public.customers(id), purchase_order_id uuid REFERENCES public.purchase_orders(id), amount numeric NOT NULL CHECK(amount>0), payment_method text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.trade_payments TO authenticated;
GRANT ALL ON public.trade_payments TO service_role;
ALTER TABLE public.trade_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY trade_payments_read ON public.trade_payments FOR SELECT TO authenticated USING(public.can_access_branch_data(owner_id,NULL,branch_id) AND public.assistant_can(owner_id,CASE WHEN customer_id IS NOT NULL THEN 'debts_manage' ELSE 'suppliers_manage' END));
CREATE OR REPLACE FUNCTION public.settle_customer_debt(p_customer_id uuid,p_amount numeric,p_request_id uuid,p_transaction_id uuid DEFAULT NULL,p_method text DEFAULT 'cash') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record;t record;s record;remaining numeric;part numeric;available numeric;payment_branch uuid;
BEGIN
SELECT * INTO c FROM public.customers WHERE id=p_customer_id FOR UPDATE;
IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_access_branch_data(c.owner_id,NULL,c.branch_id) OR NOT public.assistant_can(c.owner_id,'debts_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya deni hili' USING ERRCODE='42501'; END IF;
IF EXISTS(SELECT 1 FROM public.trade_payments WHERE id=p_request_id AND customer_id=c.id AND amount=p_amount AND owner_id=c.owner_id) THEN RETURN jsonb_build_object('ok',true,'already',true); END IF;
IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0 OR p_request_id IS NULL THEN RAISE EXCEPTION 'Kiasi si sahihi'; END IF;
SELECT coalesce(sum(balance),0) INTO available FROM public.customer_transactions WHERE customer_id=c.id AND transaction_type='sale' AND balance>0 AND (p_transaction_id IS NULL OR id=p_transaction_id) AND public.can_access_branch_data(owner_id,NULL,branch_id);
IF p_amount>available OR p_amount>coalesce(c.outstanding_balance,0) THEN RAISE EXCEPTION 'Malipo yanazidi deni lililorekodiwa'; END IF;
remaining:=p_amount;payment_branch:=c.branch_id;
FOR t IN SELECT * FROM public.customer_transactions WHERE customer_id=c.id AND transaction_type='sale' AND balance>0 AND (p_transaction_id IS NULL OR id=p_transaction_id) AND public.can_access_branch_data(owner_id,NULL,branch_id) ORDER BY transaction_date,created_at,id FOR UPDATE LOOP
EXIT WHEN remaining<=0;part:=least(remaining,t.balance);
UPDATE public.customer_transactions SET amount_paid=amount_paid+part,balance=balance-part,payment_status=CASE WHEN balance-part=0 THEN 'paid' ELSE 'partial' END WHERE id=t.id;
IF t.sale_id IS NOT NULL THEN
SELECT * INTO s FROM public.sales WHERE id=t.sale_id FOR UPDATE;
IF s.owner_id IS DISTINCT FROM c.owner_id OR s.customer_id IS DISTINCT FROM c.id OR s.branch_id IS DISTINCT FROM t.branch_id THEN RAISE EXCEPTION 'Mauzo na deni havilingani'; END IF;
UPDATE public.sales SET payment_status=CASE WHEN t.balance-part=0 THEN 'paid' ELSE 'partial' END,payment_details=coalesce(payment_details,'{}'::jsonb)||jsonb_build_object('amount_paid',t.amount_paid+part,'balance',t.balance-part) WHERE id=s.id;
UPDATE public.invoices SET status=CASE WHEN t.balance-part=0 THEN 'paid' ELSE 'partial' END WHERE sale_id=s.id;
END IF;
remaining:=remaining-part;
END LOOP;
PERFORM set_config('kiduka.sale_effects','on',true);
UPDATE public.customers SET outstanding_balance=outstanding_balance-p_amount WHERE id=c.id;
PERFORM set_config('kiduka.sale_effects','off',true);
INSERT INTO public.customer_transactions(owner_id,branch_id,customer_id,customer_name,transaction_type,total_amount,amount_paid,balance,payment_status,payment_method,notes) VALUES(c.owner_id,payment_branch,c.id,c.name,'payment',p_amount,p_amount,0,'paid',p_method,'Malipo ya deni');
INSERT INTO public.trade_payments(id,owner_id,branch_id,customer_id,amount,payment_method) VALUES(p_request_id,c.owner_id,payment_branch,c.id,p_amount,p_method);
RETURN jsonb_build_object('ok',true,'balance',c.outstanding_balance-p_amount);
END $$;
REVOKE ALL ON FUNCTION public.settle_customer_debt(uuid,numeric,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.settle_customer_debt(uuid,numeric,uuid,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.create_trade_purchase(p_supplier_id uuid,p_total numeric,p_paid numeric,p_kind text,p_notes text,p_branch_id uuid,p_request_id uuid,p_method text DEFAULT 'cash') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record;expense uuid;existing record;
BEGIN
SELECT * INTO s FROM public.suppliers WHERE id=p_supplier_id FOR UPDATE;
IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_access_branch_data(s.owner_id,NULL,p_branch_id) OR NOT public.assistant_can(s.owner_id,'suppliers_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya manunuzi' USING ERRCODE='42501'; END IF;
IF p_branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_branches WHERE id=p_branch_id AND owner_id=s.owner_id AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Tawi halilingani'; END IF;
SELECT * INTO existing FROM public.purchase_orders WHERE id=p_request_id;
IF FOUND THEN IF existing.supplier_id=p_supplier_id AND existing.total_amount=p_total AND existing.owner_id=s.owner_id THEN RETURN p_request_id; ELSE RAISE EXCEPTION 'Ombi halilingani'; END IF; END IF;
IF p_total IS NULL OR p_paid IS NULL OR p_total::text IN ('NaN','Infinity','-Infinity') OR p_paid::text IN ('NaN','Infinity','-Infinity') OR p_total<=0 OR p_paid<0 OR p_paid>p_total OR p_kind NOT IN ('goods','service') OR p_request_id IS NULL THEN RAISE EXCEPTION 'Kiasi si sahihi'; END IF;
IF p_kind='service' THEN
INSERT INTO public.expenses(owner_id,branch_id,category,amount,description,payment_method) VALUES(s.owner_id,p_branch_id,'other',p_total,'Huduma: '||s.name||' — '||coalesce(p_notes,''),p_method) RETURNING id INTO expense;
END IF;
INSERT INTO public.purchase_orders(id,owner_id,branch_id,supplier_id,supplier_name,total_amount,amount_paid,balance,status,payment_method,notes,purchase_kind,expense_id) VALUES(p_request_id,s.owner_id,p_branch_id,s.id,s.name,p_total,p_paid,p_total-p_paid,CASE WHEN p_paid=p_total THEN 'paid' WHEN p_paid>0 THEN 'partial' ELSE 'pending' END,p_method,p_notes,p_kind,expense);
UPDATE public.suppliers SET total_purchases=coalesce(total_purchases,0)+p_total,outstanding_balance=coalesce(outstanding_balance,0)+p_total-p_paid WHERE id=s.id;
RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.create_trade_purchase(uuid,numeric,numeric,text,text,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_trade_purchase(uuid,numeric,numeric,text,text,uuid,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.settle_trade_purchase(p_order_id uuid,p_amount numeric,p_request_id uuid,p_method text DEFAULT 'cash') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record;s record;
BEGIN
SELECT supplier_id INTO o FROM public.purchase_orders WHERE id=p_order_id;
SELECT * INTO s FROM public.suppliers WHERE id=o.supplier_id FOR UPDATE;
SELECT * INTO o FROM public.purchase_orders WHERE id=p_order_id FOR UPDATE;
IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_access_branch_data(o.owner_id,NULL,o.branch_id) OR NOT public.assistant_can(o.owner_id,'suppliers_manage') THEN RAISE EXCEPTION 'Huna ruhusa ya malipo' USING ERRCODE='42501'; END IF;
IF EXISTS(SELECT 1 FROM public.trade_payments WHERE id=p_request_id AND purchase_order_id=o.id AND amount=p_amount AND owner_id=o.owner_id) THEN RETURN jsonb_build_object('ok',true,'already',true); END IF;
IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0 OR p_amount>o.balance OR p_request_id IS NULL THEN RAISE EXCEPTION 'Malipo yanazidi deni au kiasi si sahihi'; END IF;
UPDATE public.purchase_orders SET amount_paid=amount_paid+p_amount,balance=balance-p_amount,status=CASE WHEN balance-p_amount=0 THEN 'paid' ELSE 'partial' END WHERE id=o.id;
UPDATE public.suppliers SET outstanding_balance=greatest(0,coalesce(outstanding_balance,0)-p_amount) WHERE id=o.supplier_id;
INSERT INTO public.trade_payments(id,owner_id,branch_id,purchase_order_id,amount,payment_method) VALUES(p_request_id,o.owner_id,o.branch_id,o.id,p_amount,p_method);
RETURN jsonb_build_object('ok',true,'balance',o.balance-p_amount);
END $$;
REVOKE ALL ON FUNCTION public.settle_trade_purchase(uuid,numeric,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.settle_trade_purchase(uuid,numeric,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_system_summary(p_days integer DEFAULT 7) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE start_at timestamptz;today_at timestamptz;
BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Admin pekee' USING ERRCODE='42501'; END IF;
IF p_days NOT IN (1,7,30,90) THEN RAISE EXCEPTION 'Kipindi si sahihi'; END IF;
today_at:=date_trunc('day',now() AT TIME ZONE 'Africa/Dar_es_Salaam') AT TIME ZONE 'Africa/Dar_es_Salaam';start_at:=today_at-(p_days-1)*interval '1 day';
RETURN jsonb_build_object('users',(SELECT count(*) FROM public.profiles),'businesses',(SELECT count(*) FROM public.businesses WHERE is_active),'products',(SELECT count(*) FROM public.products WHERE is_archived IS NOT TRUE),'newUsers',(SELECT count(*) FROM public.profiles WHERE created_at>=start_at),'activeSubs',(SELECT count(*) FROM public.user_subscriptions WHERE status='active' AND current_period_end>now()),'salesToday',(SELECT count(*) FROM public.sales WHERE created_at>=today_at),'revenueToday',(SELECT coalesce(sum(total_amount),0) FROM public.sales WHERE created_at>=today_at),'salesPeriod',(SELECT count(*) FROM public.sales WHERE created_at>=start_at),'revenuePeriod',(SELECT coalesce(sum(total_amount),0) FROM public.sales WHERE created_at>=start_at),'paidPeriod',(SELECT coalesce(sum(CASE WHEN payment_status='paid' THEN total_amount ELSE coalesce((payment_details->>'amount_paid')::numeric,0) END),0) FROM public.sales WHERE created_at>=start_at),'customerDebt',(SELECT coalesce(sum(outstanding_balance),0) FROM public.customers),'supplierDebt',(SELECT coalesce(sum(outstanding_balance),0) FROM public.suppliers),'startAt',start_at,'todayAt',today_at);
END $$;
REVOKE ALL ON FUNCTION public.admin_system_summary(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_system_summary(integer) TO authenticated;