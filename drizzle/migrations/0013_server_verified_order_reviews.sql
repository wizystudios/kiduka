CREATE OR REPLACE FUNCTION public.submit_verified_order_review(p_order_id uuid, p_product_id uuid, p_phone text, p_pin text, p_rating integer, p_review_text text DEFAULT NULL, p_customer_name text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $$
DECLARE v_identity json; v_order sokoni_orders%ROWTYPE; v_review uuid;
BEGIN
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN RETURN jsonb_build_object('success',false,'error','invalid_rating'); END IF;
 IF NOT EXISTS(SELECT 1 FROM sokoni_customers WHERE phone=p_phone AND pin_hash IS NOT NULL) THEN RETURN jsonb_build_object('success',false,'error','sign_in_required'); END IF;
 v_identity:=sokoni_verify_pin(p_phone,p_pin);
 IF coalesce((v_identity->>'success')::boolean,false)=false THEN RETURN jsonb_build_object('success',false,'error','sign_in_required'); END IF;
 SELECT * INTO v_order FROM sokoni_orders WHERE id=p_order_id AND customer_phone=v_identity->'customer'->>'phone';
 IF v_order.id IS NULL OR v_order.order_status<>'delivered' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_order.items) item WHERE item->>'product_id'=p_product_id::text) THEN RETURN jsonb_build_object('success',false,'error','purchase_not_found'); END IF;
 IF EXISTS(SELECT 1 FROM product_reviews WHERE product_id=p_product_id AND customer_phone=p_phone AND is_verified_purchase) THEN RETURN jsonb_build_object('success',false,'error','already_reviewed'); END IF;
 INSERT INTO product_reviews(product_id,customer_phone,customer_name,rating,review_text,is_verified_purchase) VALUES(p_product_id,v_identity->'customer'->>'phone',coalesce(nullif(p_customer_name,''),v_identity->'customer'->>'name'),p_rating,left(p_review_text,4000),true) RETURNING id INTO v_review;
 RETURN jsonb_build_object('success',true,'review_id',v_review);
END $$;
GRANT EXECUTE ON FUNCTION public.submit_verified_order_review(uuid,uuid,text,text,integer,text,text) TO anon, authenticated, service_role;
ALTER POLICY "Anyone can create reviews" ON public.product_reviews WITH CHECK (customer_phone IS NOT NULL AND length(customer_phone)>=9 AND rating BETWEEN 1 AND 5 AND coalesce(is_verified_purchase,false)=false);