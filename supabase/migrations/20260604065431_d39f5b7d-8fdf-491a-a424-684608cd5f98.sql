GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_branches TO authenticated;
GRANT ALL ON public.business_branches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_staff TO authenticated;
GRANT ALL ON public.branch_staff TO service_role;
GRANT SELECT, INSERT ON public.business_audit_logs TO authenticated;
GRANT ALL ON public.business_audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.owner_delete_entity(p_entity_type text, p_entity_id uuid, p_confirmation_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_id uuid;
  v_owner_id uuid;
  v_expected text;
  v_deleted int := 0;
  v_summary text;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.products p WHERE p.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF NOT public.can_access_owner_data(v_owner_id) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;

      UPDATE public.sales_items SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.inventory_movements SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.inventory_snapshots SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.sales_predictions SET product_id = NULL WHERE product_id = p_entity_id;
      DELETE FROM public.product_images WHERE product_id = p_entity_id;
      DELETE FROM public.product_reviews WHERE product_id = p_entity_id;
      UPDATE public.products SET parent_product_id = NULL WHERE parent_product_id = p_entity_id;
      DELETE FROM public.products WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Bidhaa imefutwa: %s', v_expected);

    WHEN 'assistant' THEN
      SELECT ap.owner_id, COALESCE(p.full_name, p.email, ap.assistant_id::text)
      INTO v_owner_id, v_expected
      FROM public.assistant_permissions ap
      LEFT JOIN public.profiles p ON p.id = ap.assistant_id
      WHERE ap.assistant_id = p_entity_id AND ap.owner_id = v_actor
      LIMIT 1;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      v_business_id := public.resolve_business_id_from_owner(v_owner_id);
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;

      UPDATE public.business_members SET is_active = false, updated_at = now()
      WHERE business_id = v_business_id AND user_id = p_entity_id AND role <> 'owner';
      DELETE FROM public.branch_staff WHERE user_id = p_entity_id AND branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id);
      DELETE FROM public.assistant_permissions WHERE assistant_id = p_entity_id AND owner_id = v_owner_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Msaidizi ameondolewa: %s', v_expected);

    WHEN 'branch_staff' THEN
      SELECT bs.branch_id, bb.owner_id, COALESCE(p.full_name, p.email, bs.user_id::text)
      INTO v_business_id, v_owner_id, v_expected
      FROM public.branch_staff bs
      JOIN public.business_branches bb ON bb.id = bs.branch_id
      LEFT JOIN public.profiles p ON p.id = bs.user_id
      WHERE bs.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;

      UPDATE public.business_members bm SET is_active = false, updated_at = now()
      FROM public.branch_staff bs
      WHERE bs.id = p_entity_id AND bm.user_id = bs.user_id AND bm.branch_id = bs.branch_id;
      DELETE FROM public.branch_staff WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_business_id := public.resolve_business_id_from_owner(v_owner_id);
      v_summary := format('Mfanyakazi ametolewa kwenye tawi: %s', v_expected);

    WHEN 'branch' THEN
      SELECT public.resolve_business_id_from_owner(bb.owner_id), bb.owner_id, bb.branch_name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.business_branches bb WHERE bb.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;

      UPDATE public.business_members SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      UPDATE public.products SET branch_id = NULL WHERE branch_id = p_entity_id;
      UPDATE public.sales SET branch_id = NULL WHERE branch_id = p_entity_id;
      UPDATE public.customers SET branch_id = NULL WHERE branch_id = p_entity_id;
      UPDATE public.expenses SET branch_id = NULL WHERE branch_id = p_entity_id;
      UPDATE public.inventory_movements SET branch_id = NULL WHERE branch_id = p_entity_id;
      DELETE FROM public.branch_staff WHERE branch_id = p_entity_id;
      DELETE FROM public.business_branches WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Tawi limefutwa: %s', v_expected);

    ELSE
      RETURN json_build_object('success', false, 'error', 'unsupported_type');
  END CASE;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE', v_summary, jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'timestamp', now(), 'deleted_count', v_deleted));

  RETURN json_build_object('success', true, 'deleted', v_deleted, 'business_id', v_business_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_delete_entity(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_entity(p_entity_type text, p_entity_id uuid, p_confirmation_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_id uuid;
  v_owner_id uuid;
  v_expected text;
  v_deleted int := 0;
  v_summary text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name INTO v_business_id, v_owner_id, v_expected
      FROM public.products p WHERE p.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;
      UPDATE public.sales_items SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.inventory_movements SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.inventory_snapshots SET product_id = NULL WHERE product_id = p_entity_id;
      UPDATE public.sales_predictions SET product_id = NULL WHERE product_id = p_entity_id;
      DELETE FROM public.product_images WHERE product_id = p_entity_id;
      DELETE FROM public.product_reviews WHERE product_id = p_entity_id;
      UPDATE public.products SET parent_product_id = NULL WHERE parent_product_id = p_entity_id;
      DELETE FROM public.products WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Bidhaa imefutwa: %s', v_expected);

    WHEN 'order' THEN
      SELECT COALESCE(o.business_id, public.resolve_business_id_from_owner(o.seller_id)), o.seller_id, COALESCE(o.tracking_code, o.id::text) INTO v_business_id, v_owner_id, v_expected
      FROM public.sokoni_orders o WHERE o.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;
      DELETE FROM public.return_requests WHERE order_id = p_entity_id;
      UPDATE public.payment_transactions SET order_id = NULL WHERE order_id = p_entity_id;
      DELETE FROM public.sokoni_orders WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Oda imefutwa: %s', v_expected);

    WHEN 'sale' THEN
      SELECT COALESCE(s.business_id, public.resolve_business_id_from_owner(s.owner_id)), s.owner_id, 'Sale #' || left(s.id::text, 8) INTO v_business_id, v_owner_id, v_expected
      FROM public.sales s WHERE s.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;
      UPDATE public.sokoni_orders SET linked_sale_id = NULL WHERE linked_sale_id = p_entity_id;
      DELETE FROM public.sales_items WHERE sale_id = p_entity_id;
      DELETE FROM public.sales WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Sale imefutwa: %s', v_expected);

    WHEN 'expense' THEN
      SELECT COALESCE(e.business_id, public.resolve_business_id_from_owner(e.owner_id)), e.owner_id, COALESCE(e.category, e.id::text) INTO v_business_id, v_owner_id, v_expected
      FROM public.expenses e WHERE e.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;
      DELETE FROM public.expenses WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Matumizi yamefutwa: %s', v_expected);

    WHEN 'customer' THEN
      SELECT COALESCE(c.business_id, public.resolve_business_id_from_owner(c.owner_id)), c.owner_id, c.name INTO v_business_id, v_owner_id, v_expected
      FROM public.customers c WHERE c.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch'); END IF;
      DELETE FROM public.customer_transactions WHERE customer_id = p_entity_id;
      UPDATE public.scheduled_whatsapp_messages SET customer_id = NULL WHERE customer_id = p_entity_id;
      UPDATE public.whatsapp_messages SET customer_id = NULL WHERE customer_id = p_entity_id;
      UPDATE public.sales SET customer_id = NULL WHERE customer_id = p_entity_id;
      DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE customer_id = p_entity_id);
      DELETE FROM public.micro_loans WHERE customer_id = p_entity_id;
      DELETE FROM public.customers WHERE id = p_entity_id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      v_summary := format('Mteja amefutwa: %s', v_expected);

    ELSE
      RETURN json_build_object('success', false, 'error', 'unsupported_type');
  END CASE;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, auth.uid(), p_entity_type, p_entity_id::text, 'DELETE', v_summary, jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'timestamp', now(), 'deleted_count', v_deleted));

  RETURN json_build_object('success', true, 'deleted', v_deleted, 'business_id', v_business_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_entity(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_business(p_owner_id uuid, p_confirmation_name text, p_scope jsonb DEFAULT '{"all": true}'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_expected_name text;
  v_business_id uuid;
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
  v_all boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_owner_id;
  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  v_business_id := public.resolve_business_id_from_owner(p_owner_id);
  v_expected_name := COALESCE(NULLIF(trim(v_profile.business_name), ''), NULLIF(trim(v_profile.full_name), ''), v_profile.email);

  IF lower(trim(p_confirmation_name)) <> lower(v_expected_name) THEN
    RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected_hint', left(v_expected_name, 3) || '***');
  END IF;

  v_all := COALESCE((p_scope->>'all')::boolean, false);

  IF v_all OR COALESCE((p_scope->>'orders')::boolean, false) THEN
    UPDATE public.sokoni_orders SET linked_sale_id = NULL WHERE business_id = v_business_id OR seller_id = p_owner_id;
    DELETE FROM public.return_requests WHERE order_id IN (SELECT id FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id) OR seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('return_requests', v_count);
    UPDATE public.payment_transactions SET order_id = NULL WHERE order_id IN (SELECT id FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id);
    DELETE FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sokoni_orders', v_count);
    DELETE FROM public.abandoned_carts WHERE seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('abandoned_carts', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'sales')::boolean, false) OR COALESCE((p_scope->>'products')::boolean, false) THEN
    DELETE FROM public.sales_items WHERE sale_id IN (SELECT id FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_items', v_count);
    DELETE FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'products')::boolean, false) THEN
    UPDATE public.sales_items SET product_id = NULL WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    UPDATE public.inventory_movements SET product_id = NULL WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    UPDATE public.inventory_snapshots SET product_id = NULL WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    UPDATE public.sales_predictions SET product_id = NULL WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    DELETE FROM public.product_images WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('product_images', v_count);
    DELETE FROM public.product_reviews WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('product_reviews', v_count);
    UPDATE public.products SET parent_product_id = NULL WHERE parent_product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    DELETE FROM public.inventory_movements WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_movements', v_count);
    DELETE FROM public.inventory_snapshots WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_snapshots', v_count);
    DELETE FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('products', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'customers')::boolean, false) THEN
    UPDATE public.sales SET customer_id = NULL WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id);
    UPDATE public.scheduled_whatsapp_messages SET customer_id = NULL WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id);
    UPDATE public.whatsapp_messages SET customer_id = NULL WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id);
    DELETE FROM public.customer_transactions WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id) OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customer_transactions', v_count);
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE owner_id = p_owner_id OR customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id));
    DELETE FROM public.micro_loans WHERE owner_id = p_owner_id OR customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('micro_loans', v_count);
    DELETE FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customers', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'loans')::boolean, false) THEN
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('loan_payments', v_count);
    DELETE FROM public.micro_loans WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('micro_loans', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'staff')::boolean, false) THEN
    DELETE FROM public.branch_staff WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id) OR user_id IN (SELECT user_id FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner');
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('branch_staff', v_count);
    DELETE FROM public.assistant_permissions WHERE owner_id = p_owner_id OR assistant_id IN (SELECT user_id FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner');
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('assistant_permissions', v_count);
    DELETE FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner';
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_staff_members', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'branches')::boolean, false) THEN
    UPDATE public.business_members SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    UPDATE public.products SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    UPDATE public.sales SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    UPDATE public.customers SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    UPDATE public.expenses SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    UPDATE public.inventory_movements SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    DELETE FROM public.branch_staff WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    DELETE FROM public.business_branches WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_branches', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'finance')::boolean, false) THEN
    DELETE FROM public.expenses WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expenses', v_count);
    DELETE FROM public.income_records WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('income_records', v_count);
    DELETE FROM public.journal_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_lines', v_count);
    DELETE FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_entries', v_count);
  END IF;

  IF v_all THEN
    DELETE FROM public.discounts WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('discounts', v_count);
    DELETE FROM public.coupon_codes WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('coupon_codes', v_count);
    DELETE FROM public.business_ads WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_ads', v_count);
    DELETE FROM public.business_insights WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_insights', v_count);
    DELETE FROM public.marketplace_listings WHERE seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('marketplace_listings', v_count);
    DELETE FROM public.business_compliance WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_compliance', v_count);
    DELETE FROM public.business_contracts WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_contracts', v_count);
    DELETE FROM public.user_subscriptions WHERE user_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('user_subscriptions', v_count);
    DELETE FROM public.business_members WHERE business_id = v_business_id OR user_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_members', v_count);
    DELETE FROM public.businesses WHERE id = v_business_id OR created_by = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('businesses', v_count);
  END IF;

  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES ('business_deleted', CASE WHEN v_all THEN 'Biashara imefutwa kabisa' ELSE 'Sehemu ya biashara imefutwa' END, format('Admin %s amefuta data ya %s. Scope: %s', auth.uid()::text, v_expected_name, p_scope::text), jsonb_build_object('owner_id', p_owner_id, 'business_id', v_business_id, 'business_name', v_expected_name, 'scope', p_scope, 'deleted_counts', v_deleted, 'admin_id', auth.uid(), 'at', now()));

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, auth.uid(), 'business', p_owner_id::text, CASE WHEN v_all THEN 'DELETE_FULL' ELSE 'DELETE_PARTIAL' END, format('Ufutaji wa biashara: %s', v_expected_name), jsonb_build_object('scope', p_scope, 'deleted_counts', v_deleted, 'timestamp', now()));

  RETURN json_build_object('success', true, 'deleted', v_deleted, 'all', v_all, 'business_id', v_business_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_business(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_assign_branch_staff(p_branch_id uuid, p_user_id uuid, p_role text DEFAULT 'staff', p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_business_id uuid;
  v_business_role public.business_role;
BEGIN
  SELECT owner_id, public.resolve_business_id_from_owner(owner_id)
  INTO v_owner_id, v_business_id
  FROM public.business_branches
  WHERE id = p_branch_id;

  IF v_owner_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'branch_not_found'); END IF;
  IF auth.uid() <> v_owner_id AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  v_business_role := CASE WHEN p_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'assistant'::public.business_role END;

  INSERT INTO public.branch_staff (branch_id, user_id, role, assigned_by, notes, is_active)
  VALUES (p_branch_id, p_user_id, p_role, auth.uid(), p_notes, true)
  ON CONFLICT (branch_id, user_id) DO UPDATE SET role = EXCLUDED.role, notes = EXCLUDED.notes, is_active = true, updated_at = now();

  INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
  VALUES (v_business_id, p_user_id, v_business_role, p_branch_id, auth.uid(), true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE SET branch_id = EXCLUDED.branch_id, is_active = true, updated_at = now();

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, auth.uid(), 'branch_staff', p_user_id::text, 'ASSIGN', 'Mfanyakazi ameongezwa kwenye tawi', jsonb_build_object('branch_id', p_branch_id, 'role', p_role, 'timestamp', now()));

  RETURN json_build_object('success', true, 'business_id', v_business_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_assign_branch_staff(uuid, uuid, text, text) TO authenticated;