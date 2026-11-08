CREATE OR REPLACE FUNCTION public.verify_trade_credit_safely() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid;s uuid;t uuid;supplier uuid;o uuid;v record;req uuid;
BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
BEGIN
INSERT INTO public.customers(owner_id,name) VALUES(auth.uid(),'JARIBIO rollback') RETURNING id INTO c;
INSERT INTO public.sales(owner_id,customer_id,total_amount,payment_status,payment_details) VALUES(auth.uid(),c,10000,'unpaid','{}') RETURNING id INTO s;
INSERT INTO public.invoices(owner_id,sale_id,invoice_number,customer_name,total_amount,status) VALUES(auth.uid(),s,'JARIBIO-'||s,'JARIBIO rollback',10000,'unpaid');
PERFORM public.record_sale_debt(s,c,'JARIBIO rollback',NULL,3000);
SELECT id INTO t FROM public.customer_transactions WHERE customer_id=c AND sale_id=s;
IF t IS NULL THEN RAISE EXCEPTION 'Missing sale link'; END IF;
req:=gen_random_uuid();PERFORM public.settle_customer_debt(c,2000,req,t);PERFORM public.settle_customer_debt(c,2000,req,t);
SELECT cu.outstanding_balance,sa.payment_details,i.status INTO v FROM public.customers cu JOIN public.sales sa ON sa.customer_id=cu.id JOIN public.invoices i ON i.sale_id=sa.id WHERE cu.id=c;
IF v.outstanding_balance<>5000 OR (v.payment_details->>'amount_paid')::numeric<>5000 OR v.status<>'partial' THEN RAISE EXCEPTION 'Partial mismatch'; END IF;
PERFORM public.settle_customer_debt(c,5000,gen_random_uuid(),t);
SELECT cu.outstanding_balance,sa.payment_details,i.status INTO v FROM public.customers cu JOIN public.sales sa ON sa.customer_id=cu.id JOIN public.invoices i ON i.sale_id=sa.id WHERE cu.id=c;
IF v.outstanding_balance<>0 OR (v.payment_details->>'amount_paid')::numeric<>10000 OR v.status<>'paid' THEN RAISE EXCEPTION 'Full mismatch'; END IF;
INSERT INTO public.suppliers(owner_id,name) VALUES(auth.uid(),'JARIBIO rollback') RETURNING id INTO supplier;
o:=public.create_trade_purchase(supplier,10000,3000,'service','JARIBIO',NULL,gen_random_uuid(),'cash');
PERFORM public.settle_trade_purchase(o,2000,gen_random_uuid());
SELECT po.balance,po.amount_paid,su.outstanding_balance,po.expense_id INTO v FROM public.purchase_orders po JOIN public.suppliers su ON su.id=po.supplier_id WHERE po.id=o;
IF v.balance<>5000 OR v.amount_paid<>5000 OR v.outstanding_balance<>5000 OR v.expense_id IS NULL THEN RAISE EXCEPTION 'Service mismatch'; END IF;
PERFORM public.settle_trade_purchase(o,5000,gen_random_uuid());
SELECT po.balance,su.outstanding_balance INTO v FROM public.purchase_orders po JOIN public.suppliers su ON su.id=po.supplier_id WHERE po.id=o;
IF v.balance<>0 OR v.outstanding_balance<>0 THEN RAISE EXCEPTION 'Supplier full mismatch'; END IF;
BEGIN PERFORM public.settle_trade_purchase(o,1,gen_random_uuid()); RAISE EXCEPTION 'Overpayment accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Overpayment accepted' THEN RAISE; END IF; END;
RAISE EXCEPTION 'SAFE_ROLLBACK_OK';
EXCEPTION WHEN OTHERS THEN
IF SQLERRM='SAFE_ROLLBACK_OK' THEN RETURN jsonb_build_object('ok',true,'rolledBack',true,'saleTotal',10000,'initialPaid',3000,'partialPayment',2000,'finalPayment',5000); ELSE RETURN jsonb_build_object('ok',false,'error',SQLERRM,'rolledBack',true); END IF;
END;
END $$;