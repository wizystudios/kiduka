DO $$
DECLARE v jsonb; s billing_settings%ROWTYPE;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 SELECT * INTO s FROM billing_settings WHERE id=1;
 IF s.large_business_product_threshold<>5000 OR s.base_staff_limit<>3 OR s.extra_staff_fee_small<>2000 OR s.extra_staff_fee_large<>500 OR s.branch_fee_small<>10000 OR s.branch_fee_large<>15000 THEN RAISE EXCEPTION 'Configured pricing violates requested rules'; END IF;
 v:=preview_business_billing(4,100,200,0,0);
 IF (v->>'total')::numeric<>32000 THEN RAISE EXCEPTION 'HQ extra staff must cost 2000'; END IF;
 v:=preview_business_billing(3,100,200,1,3);
 IF (v->>'total')::numeric<>40000 THEN RAISE EXCEPTION 'Small branch includes three staff'; END IF;
 v:=preview_business_billing(3,100,200,1,4);
 IF (v->>'total')::numeric<>42000 THEN RAISE EXCEPTION 'Fourth branch worker must cost 2000'; END IF;
 v:=preview_business_billing(4,5000,200,1,3);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v->'items') i WHERE i->>'key'='extra_staff' AND (i->>'unit')::numeric=500) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v->'items') i WHERE i->>'key'='branches' AND (i->>'unit')::numeric=15000) THEN RAISE EXCEPTION 'Large pricing is wrong'; END IF;
 v:=preview_business_billing(3,101,201,0,0);
 IF (v->>'total')::numeric<>32000 THEN RAISE EXCEPTION 'Each excess product/customer must cost 1000'; END IF;
END $$;
