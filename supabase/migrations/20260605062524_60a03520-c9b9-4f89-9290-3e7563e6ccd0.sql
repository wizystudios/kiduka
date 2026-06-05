ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS deactivation_reason text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text;

ALTER TABLE public.assistant_permissions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid;

ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS delete_reason text;

ALTER TABLE public.branch_staff
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid,
  ADD COLUMN IF NOT EXISTS removal_reason text;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_products_archived_owner ON public.products (owner_id, is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_business_branches_active_owner ON public.business_branches (owner_id, is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_branch_staff_active_branch ON public.branch_staff (branch_id, is_active, removed_at);

GRANT SELECT (id, is_active, deactivated_at) ON public.profiles TO authenticated;
GRANT UPDATE (is_active, deactivated_at, deactivated_by, deactivation_reason, updated_at) ON public.profiles TO authenticated;
GRANT SELECT, UPDATE (is_active, deactivated_at, deactivated_by, updated_at) ON public.assistant_permissions TO authenticated;
GRANT UPDATE (is_archived, archived_at, archived_by, archive_reason, updated_at, branch_id) ON public.products TO authenticated;
GRANT UPDATE (is_active, deleted_at, deleted_by, delete_reason, updated_at) ON public.business_branches TO authenticated;
GRANT UPDATE (is_active, removed_at, removed_by, removal_reason, updated_at) ON public.branch_staff TO authenticated;

CREATE OR REPLACE FUNCTION public.format_delete_error(p_code text, p_message text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'code', p_code,
    'message', p_message,
    'friendly', CASE
      WHEN p_code = '23503' THEN 'Data hii imeunganishwa na historia nyingine. Tumehifadhi historia na kuondoa kiungo badala ya kuvunja database.'
      WHEN p_code = '42501' THEN 'Ruhusa za database zimezuia kitendo hiki. Hakikisha umeingia kwa akaunti yenye ruhusa.'
      ELSE COALESCE(p_message, 'Hitilafu ya backend')
    END
  );
$$;

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
  v_actor uuid := auth.uid();
  v_affected jsonb := '{}'::jsonb;
  v_count int := 0;
  v_summary text;
  v_staff_user_id uuid;
  v_branch_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'details', public.format_delete_error('401', 'No authenticated user'));
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.products p WHERE p.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF NOT public.can_access_owner_data(v_owner_id) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;

      UPDATE public.products
      SET is_archived = true,
          archived_at = now(),
          archived_by = v_actor,
          archive_reason = 'soft_delete',
          updated_at = now()
      WHERE id = p_entity_id AND COALESCE(is_archived, false) = false;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('products_archived', v_count);
      v_summary := format('Bidhaa imehifadhiwa/futwa kwa soft delete: %s', v_expected);

    WHEN 'assistant' THEN
      SELECT ap.owner_id, public.resolve_business_id_from_owner(ap.owner_id), COALESCE(p.full_name, p.email, ap.assistant_id::text)
      INTO v_owner_id, v_business_id, v_expected
      FROM public.assistant_permissions ap
      LEFT JOIN public.profiles p ON p.id = ap.assistant_id
      WHERE ap.assistant_id = p_entity_id AND ap.owner_id = v_actor
      LIMIT 1;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;

      UPDATE public.assistant_permissions
      SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now()
      WHERE assistant_id = p_entity_id AND owner_id = v_owner_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('assistant_permissions_deactivated', v_count);

      UPDATE public.business_members
      SET is_active = false, branch_id = NULL, updated_at = now()
      WHERE business_id = v_business_id AND user_id = p_entity_id AND role <> 'owner' AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('business_members_deactivated', v_count);

      UPDATE public.branch_staff bs
      SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'assistant_deactivated', updated_at = now()
      WHERE bs.user_id = p_entity_id
        AND bs.branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id)
        AND bs.is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);

      UPDATE public.profiles
      SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Deactivated by business owner', updated_at = now()
      WHERE id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('profiles_deactivated', v_count);
      v_summary := format('Msaidizi amezimwa na kuondolewa kwenye biashara: %s', v_expected);

    WHEN 'branch_staff' THEN
      SELECT bs.branch_id, bs.user_id, bb.owner_id, public.resolve_business_id_from_owner(bb.owner_id), COALESCE(p.full_name, p.email, bs.user_id::text)
      INTO v_branch_id, v_staff_user_id, v_owner_id, v_business_id, v_expected
      FROM public.branch_staff bs
      JOIN public.business_branches bb ON bb.id = bs.branch_id
      LEFT JOIN public.profiles p ON p.id = bs.user_id
      WHERE bs.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;

      UPDATE public.branch_staff
      SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'removed_from_branch', updated_at = now()
      WHERE id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);

      UPDATE public.business_members
      SET branch_id = NULL, updated_at = now()
      WHERE business_id = v_business_id AND user_id = v_staff_user_id AND branch_id = v_branch_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('business_members_unassigned', v_count);
      v_summary := format('Mfanyakazi ametolewa kwenye tawi: %s', v_expected);

    WHEN 'branch' THEN
      SELECT public.resolve_business_id_from_owner(bb.owner_id), bb.owner_id, bb.branch_name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.business_branches bb WHERE bb.id = p_entity_id;

      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN RETURN json_build_object('success', false, 'error', 'forbidden'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;

      UPDATE public.business_branches
      SET is_active = false, deleted_at = now(), deleted_by = v_actor, delete_reason = 'soft_delete', updated_at = now()
      WHERE id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('branches_deactivated', v_count);

      UPDATE public.branch_staff
      SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'branch_deactivated', updated_at = now()
      WHERE branch_id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);

      UPDATE public.business_members SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('members_unassigned', v_count);
      UPDATE public.products SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('products_unassigned', v_count);
      UPDATE public.sales SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('sales_unassigned', v_count);
      UPDATE public.customers SET branch_id = NULL WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('customers_unassigned', v_count);
      UPDATE public.expenses SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('expenses_unassigned', v_count);
      UPDATE public.inventory_movements SET branch_id = NULL WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('inventory_movements_unassigned', v_count);
      v_summary := format('Tawi limezimwa na data yake imehamishwa kwenye biashara kuu: %s', v_expected);

    ELSE
      RETURN json_build_object('success', false, 'error', 'unsupported_type');
  END CASE;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, v_actor, p_entity_type, p_entity_id::text, 'SOFT_DELETE', v_summary,
    jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'timestamp', now(), 'affected', v_affected, 'actor_id', v_actor));

  RETURN json_build_object('success', true, 'soft_deleted', true, 'affected', v_affected, 'business_id', v_business_id, 'message', v_summary);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
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
  v_actor uuid := auth.uid();
  v_affected jsonb := '{}'::jsonb;
  v_count int := 0;
  v_summary text;
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name INTO v_business_id, v_owner_id, v_expected
      FROM public.products p WHERE p.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      UPDATE public.products SET is_archived = true, archived_at = now(), archived_by = v_actor, archive_reason = 'admin_soft_delete', updated_at = now()
      WHERE id = p_entity_id AND COALESCE(is_archived, false) = false;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('products_archived', v_count);
      v_summary := format('Admin amehifadhi/futa bidhaa kwa soft delete: %s', v_expected);

    WHEN 'user' THEN
      SELECT COALESCE(p.full_name, p.email, p.id::text) INTO v_expected FROM public.profiles p WHERE p.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      SELECT public.resolve_business_id_from_owner(p_entity_id) INTO v_business_id;
      UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Deactivated by super admin', updated_at = now()
      WHERE id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('profiles_deactivated', v_count);
      UPDATE public.business_members SET is_active = false, updated_at = now() WHERE user_id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('memberships_deactivated', v_count);
      UPDATE public.assistant_permissions SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now()
      WHERE assistant_id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('assistant_permissions_deactivated', v_count);
      UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'user_deactivated_by_admin', updated_at = now()
      WHERE user_id = p_entity_id AND is_active = true;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);
      v_summary := format('Admin amezima mtumiaji: %s', v_expected);

    WHEN 'order' THEN
      SELECT COALESCE(o.business_id, public.resolve_business_id_from_owner(o.seller_id)), o.seller_id, COALESCE(o.tracking_code, o.id::text) INTO v_business_id, v_owner_id, v_expected
      FROM public.sokoni_orders o WHERE o.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      DELETE FROM public.return_requests WHERE order_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('return_requests_deleted', v_count);
      UPDATE public.payment_transactions SET order_id = NULL WHERE order_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('payment_transactions_detached', v_count);
      DELETE FROM public.sokoni_orders WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('orders_deleted', v_count);
      v_summary := format('Oda imefutwa: %s', v_expected);

    WHEN 'sale' THEN
      SELECT COALESCE(s.business_id, public.resolve_business_id_from_owner(s.owner_id)), s.owner_id, 'Sale #' || left(s.id::text, 8) INTO v_business_id, v_owner_id, v_expected
      FROM public.sales s WHERE s.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      UPDATE public.sokoni_orders SET linked_sale_id = NULL WHERE linked_sale_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('orders_detached', v_count);
      DELETE FROM public.sales_items WHERE sale_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_items_deleted', v_count);
      DELETE FROM public.sales WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_deleted', v_count);
      v_summary := format('Sale imefutwa: %s', v_expected);

    WHEN 'expense' THEN
      SELECT COALESCE(e.business_id, public.resolve_business_id_from_owner(e.owner_id)), e.owner_id, COALESCE(e.category, e.id::text) INTO v_business_id, v_owner_id, v_expected
      FROM public.expenses e WHERE e.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      DELETE FROM public.expenses WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('expenses_deleted', v_count);
      v_summary := format('Matumizi yamefutwa: %s', v_expected);

    WHEN 'customer' THEN
      SELECT COALESCE(c.business_id, public.resolve_business_id_from_owner(c.owner_id)), c.owner_id, c.name INTO v_business_id, v_owner_id, v_expected
      FROM public.customers c WHERE c.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected); END IF;
      UPDATE public.sales SET customer_id = NULL WHERE customer_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_customer_detached', v_count);
      UPDATE public.scheduled_whatsapp_messages SET customer_id = NULL WHERE customer_id = p_entity_id;
      UPDATE public.whatsapp_messages SET customer_id = NULL WHERE customer_id = p_entity_id;
      DELETE FROM public.customer_transactions WHERE customer_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('customer_transactions_deleted', v_count);
      DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE customer_id = p_entity_id);
      DELETE FROM public.micro_loans WHERE customer_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('micro_loans_deleted', v_count);
      DELETE FROM public.customers WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('customers_deleted', v_count);
      v_summary := format('Mteja amefutwa: %s', v_expected);

    WHEN 'branch' THEN
      RETURN public.owner_delete_entity('branch', p_entity_id, p_confirmation_name);
    WHEN 'branch_staff' THEN
      RETURN public.owner_delete_entity('branch_staff', p_entity_id, p_confirmation_name);
    WHEN 'assistant' THEN
      RETURN public.owner_delete_entity('assistant', p_entity_id, p_confirmation_name);

    ELSE
      RETURN json_build_object('success', false, 'error', 'unsupported_type');
  END CASE;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, v_actor, p_entity_type, p_entity_id::text, CASE WHEN p_entity_type IN ('product','user') THEN 'SOFT_DELETE' ELSE 'DELETE' END, v_summary,
    jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'timestamp', now(), 'affected', v_affected, 'actor_id', v_actor));

  RETURN json_build_object('success', true, 'affected', v_affected, 'business_id', v_business_id, 'message', v_summary);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_entity(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_deactivate_user(p_user_id uuid, p_reason text DEFAULT 'Deactivated by admin')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_business_id uuid;
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  SELECT COALESCE(full_name, email, id::text), public.resolve_business_id_from_owner(id) INTO v_name, v_business_id
  FROM public.profiles WHERE id = p_user_id;
  IF v_name IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;

  UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = p_reason, updated_at = now()
  WHERE id = p_user_id;
  UPDATE public.business_members SET is_active = false, updated_at = now() WHERE user_id = p_user_id;
  UPDATE public.assistant_permissions SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now() WHERE assistant_id = p_user_id;
  UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'user_deactivated', updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, v_actor, 'user', p_user_id::text, 'DEACTIVATE', format('Mtumiaji amezimwa: %s', v_name), jsonb_build_object('reason', p_reason, 'timestamp', now()));
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reactivate_user(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  SELECT COALESCE(full_name, email, id::text) INTO v_name FROM public.profiles WHERE id = p_user_id;
  IF v_name IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found'); END IF;
  UPDATE public.profiles SET is_active = true, deactivated_at = NULL, deactivated_by = NULL, deactivation_reason = NULL, updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (public.resolve_business_id_from_owner(p_user_id), v_actor, 'user', p_user_id::text, 'REACTIVATE', format('Mtumiaji amerudishwa: %s', v_name), jsonb_build_object('timestamp', now()));
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_assign_branch_staff(p_branch_id uuid, p_user_id uuid, p_role text DEFAULT 'staff', p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_business_id uuid;
  v_actor uuid := auth.uid();
  v_profile_name text;
  v_previous_branch uuid;
BEGIN
  SELECT bb.owner_id, public.resolve_business_id_from_owner(bb.owner_id)
  INTO v_owner_id, v_business_id
  FROM public.business_branches bb
  WHERE bb.id = p_branch_id AND bb.is_active = true;

  IF v_owner_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'branch_not_found_or_inactive'); END IF;
  IF v_actor <> v_owner_id AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(full_name, email, p_user_id::text) INTO v_profile_name FROM public.profiles WHERE id = p_user_id AND is_active = true;
  IF v_profile_name IS NULL THEN RETURN json_build_object('success', false, 'error', 'user_not_found_or_deactivated'); END IF;

  SELECT branch_id INTO v_previous_branch
  FROM public.business_members
  WHERE business_id = v_business_id AND user_id = p_user_id AND is_active = true
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.branch_staff
  SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'transferred_to_other_branch', updated_at = now()
  WHERE user_id = p_user_id
    AND branch_id <> p_branch_id
    AND branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id)
    AND is_active = true;

  INSERT INTO public.branch_staff (branch_id, user_id, role, assigned_by, notes, is_active, removed_at, removed_by, removal_reason)
  VALUES (p_branch_id, p_user_id, COALESCE(NULLIF(p_role, ''), 'staff'), v_actor, p_notes, true, NULL, NULL, NULL)
  ON CONFLICT (branch_id, user_id) DO UPDATE SET role = EXCLUDED.role, notes = EXCLUDED.notes, is_active = true, removed_at = NULL, removed_by = NULL, removal_reason = NULL, updated_at = now();

  INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
  VALUES (v_business_id, p_user_id, CASE WHEN p_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'salesperson'::public.business_role END, p_branch_id, v_actor, true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE SET branch_id = EXCLUDED.branch_id, is_active = true, updated_at = now();

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (v_business_id, v_actor, 'branch_staff', p_user_id::text, CASE WHEN v_previous_branch IS NULL THEN 'ASSIGN' ELSE 'TRANSFER' END,
          format('Mfanyakazi %s amewekwa kwenye tawi', v_profile_name),
          jsonb_build_object('branch_id', p_branch_id, 'previous_branch_id', v_previous_branch, 'role', p_role, 'timestamp', now()));

  RETURN json_build_object('success', true, 'business_id', v_business_id, 'previous_branch_id', v_previous_branch);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;
GRANT EXECUTE ON FUNCTION public.owner_assign_branch_staff(uuid, uuid, text, text) TO authenticated;