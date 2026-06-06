CREATE OR REPLACE FUNCTION public.audit_delete_attempt(
  p_business_id uuid,
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_summary text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (p_business_id, p_actor_id, p_entity_type, p_entity_id, p_action, p_summary, COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('timestamp', now()));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_delete_attempt failed: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_delete_attempt(uuid, uuid, text, text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.audit_delete_attempt(uuid, uuid, text, text, text, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.owner_assign_branch_staff(p_branch_id uuid, p_user_id uuid, p_role text DEFAULT 'staff'::text, p_notes text DEFAULT NULL::text)
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
  v_previous_branch_name text;
  v_new_branch_name text;
  v_deactivated_count int := 0;
BEGIN
  SELECT bb.owner_id, public.resolve_business_id_from_owner(bb.owner_id), bb.branch_name
  INTO v_owner_id, v_business_id, v_new_branch_name
  FROM public.business_branches bb
  WHERE bb.id = p_branch_id AND bb.is_active = true AND bb.deleted_at IS NULL;

  IF v_owner_id IS NULL THEN
    PERFORM public.audit_delete_attempt(NULL, v_actor, 'branch_staff', p_user_id::text, 'TRANSFER_FAILED', 'Branch transfer failed: branch not found/inactive', jsonb_build_object('target_branch_id', p_branch_id, 'error', 'branch_not_found_or_inactive'));
    RETURN json_build_object('success', false, 'error', 'branch_not_found_or_inactive', 'message', 'Tawi halipo au limezimwa');
  END IF;

  IF v_actor <> v_owner_id AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_user_id::text, 'TRANSFER_FAILED', 'Branch transfer failed: forbidden', jsonb_build_object('target_branch_id', p_branch_id, 'error', 'forbidden'));
    RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kuhamisha mfanyakazi huyu');
  END IF;

  SELECT COALESCE(full_name, email, p_user_id::text) INTO v_profile_name
  FROM public.profiles
  WHERE id = p_user_id AND COALESCE(is_active, true) = true;

  IF v_profile_name IS NULL THEN
    PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_user_id::text, 'TRANSFER_FAILED', 'Branch transfer failed: user not found/deactivated', jsonb_build_object('target_branch_id', p_branch_id, 'error', 'user_not_found_or_deactivated'));
    RETURN json_build_object('success', false, 'error', 'user_not_found_or_deactivated', 'message', 'Mtumiaji hajapatikana au amezimwa');
  END IF;

  SELECT bs.branch_id, bb.branch_name
  INTO v_previous_branch, v_previous_branch_name
  FROM public.branch_staff bs
  JOIN public.business_branches bb ON bb.id = bs.branch_id
  WHERE bs.user_id = p_user_id
    AND bb.owner_id = v_owner_id
    AND bs.is_active = true
  ORDER BY bs.updated_at DESC NULLS LAST, bs.assigned_at DESC
  LIMIT 1;

  UPDATE public.branch_staff bs
  SET is_active = false,
      removed_at = now(),
      removed_by = v_actor,
      removal_reason = CASE WHEN bs.branch_id = p_branch_id THEN 'reassigned_to_same_branch' ELSE 'transferred_to_other_branch' END,
      updated_at = now()
  WHERE bs.user_id = p_user_id
    AND bs.branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id)
    AND bs.is_active = true;
  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;

  INSERT INTO public.branch_staff (branch_id, user_id, role, assigned_by, notes, is_active, removed_at, removed_by, removal_reason)
  VALUES (p_branch_id, p_user_id, COALESCE(NULLIF(p_role, ''), 'staff'), v_actor, p_notes, true, NULL, NULL, NULL)
  ON CONFLICT (branch_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      notes = EXCLUDED.notes,
      is_active = true,
      removed_at = NULL,
      removed_by = NULL,
      removal_reason = NULL,
      updated_at = now();

  INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
  VALUES (v_business_id, p_user_id, CASE WHEN p_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'salesperson'::public.business_role END, p_branch_id, v_actor, true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE
  SET branch_id = EXCLUDED.branch_id,
      is_active = true,
      updated_at = now();

  PERFORM public.audit_delete_attempt(
    v_business_id,
    v_actor,
    'branch_staff',
    p_user_id::text,
    CASE WHEN v_previous_branch IS NULL THEN 'ASSIGN' ELSE 'TRANSFER' END,
    format('Mfanyakazi %s amehamishwa kwenda %s', v_profile_name, v_new_branch_name),
    jsonb_build_object('new_branch_id', p_branch_id, 'new_branch_name', v_new_branch_name, 'previous_branch_id', v_previous_branch, 'previous_branch_name', v_previous_branch_name, 'role', p_role, 'old_assignments_deactivated', v_deactivated_count, 'stock_sales_policy', 'Stock na sales za zamani zinabaki kwenye tawi la awali kwa historia; mauzo mapya yataenda tawi jipya')
  );

  RETURN json_build_object('success', true, 'business_id', v_business_id, 'previous_branch_id', v_previous_branch, 'new_branch_id', p_branch_id, 'old_assignments_deactivated', v_deactivated_count, 'message', 'Mfanyakazi amehamishwa; historia ya stock/sales imehifadhiwa');
EXCEPTION WHEN OTHERS THEN
  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_user_id::text, 'TRANSFER_FAILED', SQLERRM, jsonb_build_object('error', SQLSTATE, 'details', public.format_delete_error(SQLSTATE, SQLERRM)));
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
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
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'Tafadhali ingia kwanza', 'details', public.format_delete_error('401', 'No authenticated user'));
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.products p WHERE p.id = p_entity_id;

      IF v_expected IS NULL THEN
        PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Product not found', jsonb_build_object('error', 'not_found'));
        RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Bidhaa haijapatikana');
      END IF;
      IF NOT public.can_access_owner_data(v_owner_id) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Product delete forbidden', jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'error', 'forbidden'));
        RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kufuta bidhaa hii');
      END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Product name mismatch', jsonb_build_object('owner_id', v_owner_id, 'expected', v_expected, 'error', 'name_mismatch'));
        RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani');
      END IF;

      UPDATE public.products
      SET is_archived = true,
          archived_at = now(),
          archived_by = v_actor,
          archive_reason = 'soft_delete',
          updated_at = now()
      WHERE id = p_entity_id;
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

      IF v_expected IS NULL THEN
        PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Assistant not found', jsonb_build_object('error', 'not_found'));
        RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Msaidizi hajapatikana');
      END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Assistant name mismatch', jsonb_build_object('owner_id', v_owner_id, 'expected', v_expected, 'error', 'name_mismatch'));
        RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani');
      END IF;

      UPDATE public.assistant_permissions SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now() WHERE assistant_id = p_entity_id AND owner_id = v_owner_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('assistant_permissions_deactivated', v_count);
      UPDATE public.business_members SET is_active = false, branch_id = NULL, updated_at = now() WHERE business_id = v_business_id AND user_id = p_entity_id AND role <> 'owner';
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('business_members_deactivated', v_count);
      UPDATE public.branch_staff bs SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'assistant_deactivated', updated_at = now() WHERE bs.user_id = p_entity_id AND bs.branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);
      UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Deactivated by business owner', updated_at = now() WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('profiles_deactivated', v_count);
      v_summary := format('Msaidizi amezimwa na kuondolewa kwenye biashara: %s', v_expected);

    WHEN 'branch_staff' THEN
      SELECT bs.branch_id, bs.user_id, bb.owner_id, public.resolve_business_id_from_owner(bb.owner_id), COALESCE(p.full_name, p.email, bs.user_id::text)
      INTO v_branch_id, v_staff_user_id, v_owner_id, v_business_id, v_expected
      FROM public.branch_staff bs
      JOIN public.business_branches bb ON bb.id = bs.branch_id
      LEFT JOIN public.profiles p ON p.id = bs.user_id
      WHERE bs.id = p_entity_id;

      IF v_expected IS NULL THEN
        PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch staff not found', jsonb_build_object('error', 'not_found'));
        RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Mfanyakazi wa tawi hajapatikana');
      END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch staff delete forbidden', jsonb_build_object('owner_id', v_owner_id, 'error', 'forbidden'));
        RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kumtoa mfanyakazi huyu');
      END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch staff name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch'));
        RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani');
      END IF;

      UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'removed_from_branch', updated_at = now() WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);
      UPDATE public.business_members SET branch_id = NULL, updated_at = now() WHERE business_id = v_business_id AND user_id = v_staff_user_id AND branch_id = v_branch_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('business_members_unassigned', v_count);
      v_summary := format('Mfanyakazi ametolewa kwenye tawi: %s', v_expected);

    WHEN 'branch' THEN
      SELECT public.resolve_business_id_from_owner(bb.owner_id), bb.owner_id, bb.branch_name
      INTO v_business_id, v_owner_id, v_expected
      FROM public.business_branches bb WHERE bb.id = p_entity_id;

      IF v_expected IS NULL THEN
        PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch not found', jsonb_build_object('error', 'not_found'));
        RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Tawi halijapatikana');
      END IF;
      IF v_owner_id <> v_actor AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch delete forbidden', jsonb_build_object('owner_id', v_owner_id, 'error', 'forbidden'));
        RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kufuta tawi hili');
      END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN
        PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Branch name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch'));
        RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani');
      END IF;

      UPDATE public.business_branches SET is_active = false, deleted_at = now(), deleted_by = v_actor, delete_reason = 'soft_delete', updated_at = now() WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('branches_deactivated', v_count);
      UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'branch_deactivated', updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);
      UPDATE public.business_members SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('members_unassigned', v_count);
      UPDATE public.products SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('products_unassigned', v_count);
      UPDATE public.sales SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_unassigned', v_count);
      UPDATE public.customers SET branch_id = NULL WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('customers_unassigned', v_count);
      UPDATE public.expenses SET branch_id = NULL, updated_at = now() WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('expenses_unassigned', v_count);
      UPDATE public.inventory_movements SET branch_id = NULL WHERE branch_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('inventory_movements_unassigned', v_count);
      v_summary := format('Tawi limezimwa na stock/sales zimehamishwa kwenye biashara kuu: %s', v_expected);

    ELSE
      PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Unsupported delete type', jsonb_build_object('error', 'unsupported_type'));
      RETURN json_build_object('success', false, 'error', 'unsupported_type', 'message', 'Aina hii ya kufuta haijaungwa mkono');
  END CASE;

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'SOFT_DELETE', v_summary, jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'affected', v_affected, 'actor_id', v_actor));
  RETURN json_build_object('success', true, 'soft_deleted', true, 'affected', v_affected, 'business_id', v_business_id, 'message', v_summary);
EXCEPTION WHEN OTHERS THEN
  PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', SQLERRM, jsonb_build_object('error', SQLSTATE, 'details', public.format_delete_error(SQLSTATE, SQLERRM)));
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;

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
    PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Admin delete unauthorized', jsonb_build_object('error', 'unauthorized'));
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'Huna ruhusa ya Super Admin');
  END IF;

  CASE p_entity_type
    WHEN 'product' THEN
      SELECT COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.owner_id, p.name INTO v_business_id, v_owner_id, v_expected FROM public.products p WHERE p.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Bidhaa haijapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Product name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
      UPDATE public.products SET is_archived = true, archived_at = now(), archived_by = v_actor, archive_reason = 'admin_soft_delete', updated_at = now() WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('products_archived', v_count);
      v_summary := format('Admin amehifadhi/futa bidhaa kwa soft delete: %s', v_expected);

    WHEN 'user' THEN
      SELECT COALESCE(p.full_name, p.email, p.id::text), public.resolve_business_id_from_owner(p.id) INTO v_expected, v_business_id FROM public.profiles p WHERE p.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Mtumiaji hajapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'User name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
      UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Deactivated by super admin', updated_at = now() WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('profiles_deactivated', v_count);
      UPDATE public.business_members SET is_active = false, updated_at = now() WHERE user_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('memberships_deactivated', v_count);
      UPDATE public.assistant_permissions SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now() WHERE assistant_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('assistant_permissions_deactivated', v_count);
      UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'user_deactivated_by_admin', updated_at = now() WHERE user_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('branch_staff_deactivated', v_count);
      v_summary := format('Admin amezima mtumiaji: %s', v_expected);

    WHEN 'branch', 'branch_staff', 'assistant' THEN
      RETURN public.owner_delete_entity(p_entity_type, p_entity_id, p_confirmation_name);

    WHEN 'order' THEN
      SELECT COALESCE(o.business_id, public.resolve_business_id_from_owner(o.seller_id)), o.seller_id, COALESCE(o.tracking_code, o.id::text) INTO v_business_id, v_owner_id, v_expected FROM public.sokoni_orders o WHERE o.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Oda haijapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Order name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
      DELETE FROM public.return_requests WHERE order_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('return_requests_deleted', v_count);
      UPDATE public.payment_transactions SET order_id = NULL WHERE order_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('payment_transactions_detached', v_count);
      DELETE FROM public.sokoni_orders WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('orders_deleted', v_count);
      v_summary := format('Oda imefutwa: %s', v_expected);

    WHEN 'sale' THEN
      SELECT COALESCE(s.business_id, public.resolve_business_id_from_owner(s.owner_id)), s.owner_id, 'Sale #' || left(s.id::text, 8) INTO v_business_id, v_owner_id, v_expected FROM public.sales s WHERE s.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Sale haijapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Sale name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
      UPDATE public.sokoni_orders SET linked_sale_id = NULL WHERE linked_sale_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('orders_detached', v_count);
      DELETE FROM public.sales_items WHERE sale_id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_items_deleted', v_count);
      DELETE FROM public.sales WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('sales_deleted', v_count);
      v_summary := format('Sale imefutwa: %s', v_expected);

    WHEN 'expense' THEN
      SELECT COALESCE(e.business_id, public.resolve_business_id_from_owner(e.owner_id)), e.owner_id, COALESCE(e.category, e.id::text) INTO v_business_id, v_owner_id, v_expected FROM public.expenses e WHERE e.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Matumizi hayajapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Expense name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
      DELETE FROM public.expenses WHERE id = p_entity_id;
      GET DIAGNOSTICS v_count = ROW_COUNT; v_affected := v_affected || jsonb_build_object('expenses_deleted', v_count);
      v_summary := format('Matumizi yamefutwa: %s', v_expected);

    WHEN 'customer' THEN
      SELECT COALESCE(c.business_id, public.resolve_business_id_from_owner(c.owner_id)), c.owner_id, c.name INTO v_business_id, v_owner_id, v_expected FROM public.customers c WHERE c.id = p_entity_id;
      IF v_expected IS NULL THEN RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Mteja hajapatikana'); END IF;
      IF lower(trim(p_confirmation_name)) <> lower(trim(v_expected)) THEN PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Customer name mismatch', jsonb_build_object('expected', v_expected, 'error', 'name_mismatch')); RETURN json_build_object('success', false, 'error', 'name_mismatch', 'expected', v_expected, 'message', 'Jina la uthibitisho halilingani'); END IF;
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

    ELSE
      PERFORM public.audit_delete_attempt(NULL, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', 'Unsupported admin delete type', jsonb_build_object('error', 'unsupported_type'));
      RETURN json_build_object('success', false, 'error', 'unsupported_type', 'message', 'Aina hii ya kufuta haijaungwa mkono');
  END CASE;

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, CASE WHEN p_entity_type IN ('product','user') THEN 'SOFT_DELETE' ELSE 'DELETE' END, v_summary, jsonb_build_object('owner_id', v_owner_id, 'name', v_expected, 'affected', v_affected, 'actor_id', v_actor));
  RETURN json_build_object('success', true, 'affected', v_affected, 'business_id', v_business_id, 'message', v_summary);
EXCEPTION WHEN OTHERS THEN
  PERFORM public.audit_delete_attempt(v_business_id, v_actor, p_entity_type, p_entity_id::text, 'DELETE_FAILED', SQLERRM, jsonb_build_object('error', SQLSTATE, 'details', public.format_delete_error(SQLSTATE, SQLERRM)));
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;

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
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    PERFORM public.audit_delete_attempt(NULL, v_actor, 'business', p_owner_id::text, 'DELETE_FAILED', 'Business delete unauthorized', jsonb_build_object('error', 'unauthorized'));
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'Huna ruhusa ya Super Admin');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_owner_id;
  IF v_profile.id IS NULL THEN
    PERFORM public.audit_delete_attempt(NULL, v_actor, 'business', p_owner_id::text, 'DELETE_FAILED', 'Business owner profile not found', jsonb_build_object('error', 'not_found'));
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Biashara/owner haijapatikana');
  END IF;

  v_business_id := public.resolve_business_id_from_owner(p_owner_id);
  v_expected_name := COALESCE(NULLIF(trim(v_profile.business_name), ''), NULLIF(trim(v_profile.full_name), ''), v_profile.email);

  IF lower(trim(p_confirmation_name)) <> lower(v_expected_name) THEN
    PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'business', p_owner_id::text, 'DELETE_FAILED', 'Business name mismatch', jsonb_build_object('expected_hint', left(v_expected_name, 3) || '***', 'error', 'name_mismatch'));
    RETURN json_build_object('success', false, 'error', 'name_mismatch', 'message', 'Jina la uthibitisho halilingani', 'expected_hint', left(v_expected_name, 3) || '***');
  END IF;

  v_all := COALESCE((p_scope->>'all')::boolean, false);

  IF v_all OR COALESCE((p_scope->>'orders')::boolean, false) THEN
    DELETE FROM public.return_requests WHERE order_id IN (SELECT id FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id) OR seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('return_requests_deleted', v_count);
    UPDATE public.payment_transactions SET order_id = NULL WHERE order_id IN (SELECT id FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('payment_transactions_detached', v_count);
    DELETE FROM public.sokoni_orders WHERE business_id = v_business_id OR seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sokoni_orders_deleted', v_count);
    DELETE FROM public.abandoned_carts WHERE seller_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('abandoned_carts_deleted', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'sales')::boolean, false) THEN
    DELETE FROM public.sales_items WHERE sale_id IN (SELECT id FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_items_deleted', v_count);
    DELETE FROM public.sales WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_deleted', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'products')::boolean, false) THEN
    UPDATE public.product_images SET is_primary = false WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('product_images_retained', v_count);
    UPDATE public.products SET is_archived = true, archived_at = now(), archived_by = v_actor, archive_reason = CASE WHEN v_all THEN 'business_deactivated' ELSE 'admin_scope_soft_delete' END, updated_at = now() WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('products_archived', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'customers')::boolean, false) THEN
    UPDATE public.sales SET customer_id = NULL WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_customer_detached', v_count);
    DELETE FROM public.customer_transactions WHERE customer_id IN (SELECT id FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id) OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customer_transactions_deleted', v_count);
    DELETE FROM public.customers WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customers_deleted', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'loans')::boolean, false) THEN
    DELETE FROM public.loan_payments WHERE loan_id IN (SELECT id FROM public.micro_loans WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('loan_payments_deleted', v_count);
    DELETE FROM public.micro_loans WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('micro_loans_deleted', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'staff')::boolean, false) THEN
    UPDATE public.branch_staff SET is_active = false, removed_at = now(), removed_by = v_actor, removal_reason = 'business_deactivated', updated_at = now() WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id) OR user_id IN (SELECT user_id FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner');
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('branch_staff_deactivated', v_count);
    UPDATE public.assistant_permissions SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, updated_at = now() WHERE owner_id = p_owner_id OR assistant_id IN (SELECT user_id FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner');
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('assistant_permissions_deactivated', v_count);
    UPDATE public.business_members SET is_active = false, branch_id = NULL, updated_at = now() WHERE business_id = v_business_id AND role <> 'owner';
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_staff_members_deactivated', v_count);
    UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Business deactivated by super admin', updated_at = now() WHERE id IN (SELECT user_id FROM public.business_members WHERE business_id = v_business_id AND role <> 'owner');
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('staff_profiles_deactivated', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'branches')::boolean, false) THEN
    UPDATE public.business_members SET branch_id = NULL, updated_at = now() WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('members_unassigned_from_branches', v_count);
    UPDATE public.products SET branch_id = NULL, updated_at = now() WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('products_unassigned_from_branches', v_count);
    UPDATE public.sales SET branch_id = NULL, updated_at = now() WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('sales_unassigned_from_branches', v_count);
    UPDATE public.customers SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('customers_unassigned_from_branches', v_count);
    UPDATE public.expenses SET branch_id = NULL, updated_at = now() WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expenses_unassigned_from_branches', v_count);
    UPDATE public.inventory_movements SET branch_id = NULL WHERE branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('inventory_movements_unassigned_from_branches', v_count);
    UPDATE public.business_branches SET is_active = false, deleted_at = now(), deleted_by = v_actor, delete_reason = 'business_deactivated', updated_at = now() WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_branches_deactivated', v_count);
  END IF;

  IF v_all OR COALESCE((p_scope->>'finance')::boolean, false) THEN
    DELETE FROM public.expenses WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expenses_deleted', v_count);
    DELETE FROM public.income_records WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('income_records_deleted', v_count);
    DELETE FROM public.journal_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_lines_deleted', v_count);
    DELETE FROM public.journal_entries WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('journal_entries_deleted', v_count);
  END IF;

  IF v_all THEN
    DELETE FROM public.discounts WHERE business_id = v_business_id OR owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('discounts_deleted', v_count);
    DELETE FROM public.coupon_codes WHERE owner_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('coupon_codes_deleted', v_count);
    UPDATE public.businesses SET is_active = false, updated_at = now() WHERE id = v_business_id OR created_by = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('businesses_deactivated', v_count);
    UPDATE public.business_members SET is_active = false, branch_id = NULL, updated_at = now() WHERE business_id = v_business_id OR user_id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('business_members_deactivated', v_count);
    UPDATE public.profiles SET is_active = false, deactivated_at = now(), deactivated_by = v_actor, deactivation_reason = 'Business fully deactivated by super admin', updated_at = now() WHERE id = p_owner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('owner_profile_deactivated', v_count);
  END IF;

  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES ('business_deleted', CASE WHEN v_all THEN 'Biashara imezimwa kabisa' ELSE 'Sehemu ya biashara imefutwa/imezimwa' END, format('Admin %s amefuta/amezima data ya %s. Scope: %s', v_actor::text, v_expected_name, p_scope::text), jsonb_build_object('owner_id', p_owner_id, 'business_id', v_business_id, 'business_name', v_expected_name, 'scope', p_scope, 'affected_counts', v_deleted, 'admin_id', v_actor, 'at', now()));

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'business', p_owner_id::text, CASE WHEN v_all THEN 'DELETE_FULL' ELSE 'DELETE_PARTIAL' END, format('Ufutaji/deactivation wa biashara: %s', v_expected_name), jsonb_build_object('scope', p_scope, 'affected_counts', v_deleted, 'business_name', v_expected_name));

  RETURN json_build_object('success', true, 'deleted', v_deleted, 'affected', v_deleted, 'all', v_all, 'business_id', v_business_id, 'message', CASE WHEN v_all THEN 'Biashara imezimwa na kufichwa mfumo mzima; historia muhimu imehifadhiwa kwa audit/reports' ELSE 'Sehemu zilizochaguliwa zimefutwa/zimzimwa' END);
EXCEPTION WHEN OTHERS THEN
  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'business', p_owner_id::text, 'DELETE_FAILED', SQLERRM, jsonb_build_object('scope', p_scope, 'error', SQLSTATE, 'details', public.format_delete_error(SQLSTATE, SQLERRM)));
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;