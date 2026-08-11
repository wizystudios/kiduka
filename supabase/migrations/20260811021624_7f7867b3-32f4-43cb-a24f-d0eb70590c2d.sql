DROP INDEX IF EXISTS public.business_branches_owner_id_branch_name_active_key;
ALTER TABLE public.business_branches DROP CONSTRAINT IF EXISTS business_branches_owner_id_branch_name_key;
CREATE UNIQUE INDEX business_branches_owner_id_branch_name_active_key
ON public.business_branches (owner_id, lower(branch_name))
WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.owner_assign_branch_staff(
  p_branch_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'staff',
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_business_id uuid;
  v_actor uuid := auth.uid();
  v_profile_name text;
  v_previous_branch uuid;
  v_new_branch_name text;
  v_business_role public.business_role;
BEGIN
  IF p_role NOT IN ('manager', 'staff') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_role', 'message', 'Jukumu la mfanyakazi halitambuliki');
  END IF;

  SELECT bb.owner_id, bb.branch_name INTO v_owner_id, v_new_branch_name
  FROM public.business_branches bb
  WHERE bb.id = p_branch_id AND bb.is_active = true AND bb.deleted_at IS NULL;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'branch_not_found_or_inactive', 'message', 'Tawi halipo au limezimwa');
  END IF;

  IF v_actor <> v_owner_id AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kusimamia tawi hili');
  END IF;

  v_business_id := public.ensure_owner_business(v_owner_id);
  IF v_business_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'owner_business_missing', 'message', 'Biashara ya mmiliki haijapatikana');
  END IF;

  SELECT COALESCE(full_name, email, p_user_id::text) INTO v_profile_name
  FROM public.profiles
  WHERE id = p_user_id AND COALESCE(is_active, true) = true;
  IF v_profile_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found_or_deactivated', 'message', 'Mtumiaji hajapatikana au amezimwa');
  END IF;

  SELECT bs.branch_id INTO v_previous_branch
  FROM public.branch_staff bs
  JOIN public.business_branches bb ON bb.id = bs.branch_id
  WHERE bs.user_id = p_user_id AND bb.owner_id = v_owner_id AND bs.is_active = true
  ORDER BY bs.updated_at DESC NULLS LAST, bs.assigned_at DESC
  LIMIT 1;

  UPDATE public.branch_staff bs
  SET is_active = false, removed_at = now(), removed_by = v_actor,
      removal_reason = CASE WHEN bs.branch_id = p_branch_id THEN 'assignment_updated' ELSE 'transferred_to_other_branch' END,
      updated_at = now()
  WHERE bs.user_id = p_user_id
    AND bs.branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id)
    AND bs.is_active = true;

  INSERT INTO public.branch_staff (branch_id, user_id, role, assigned_by, notes, is_active, removed_at, removed_by, removal_reason)
  VALUES (p_branch_id, p_user_id, p_role, v_actor, p_notes, true, NULL, NULL, NULL)
  ON CONFLICT (branch_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, notes = COALESCE(EXCLUDED.notes, branch_staff.notes), is_active = true,
      assigned_by = EXCLUDED.assigned_by, removed_at = NULL, removed_by = NULL,
      removal_reason = NULL, updated_at = now();

  v_business_role := CASE WHEN p_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'salesperson'::public.business_role END;

  UPDATE public.business_members
  SET is_active = false, branch_id = NULL, updated_at = now()
  WHERE business_id = v_business_id
    AND user_id = p_user_id
    AND role IN ('branch_manager'::public.business_role, 'salesperson'::public.business_role);

  INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
  VALUES (v_business_id, p_user_id, v_business_role, p_branch_id, v_actor, true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE
  SET branch_id = EXCLUDED.branch_id, invited_by = EXCLUDED.invited_by,
      is_active = true, updated_at = now();

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_user_id::text,
    CASE WHEN v_previous_branch IS NULL THEN 'ASSIGN' WHEN v_previous_branch = p_branch_id THEN 'UPDATE' ELSE 'TRANSFER' END,
    format('Mfanyakazi %s amepewa tawi %s', v_profile_name, v_new_branch_name),
    jsonb_build_object('branch_id', p_branch_id, 'previous_branch_id', v_previous_branch, 'role', p_role));

  RETURN json_build_object('success', true, 'business_id', v_business_id, 'branch_id', p_branch_id, 'user_id', p_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;

REVOKE ALL ON FUNCTION public.owner_assign_branch_staff(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_assign_branch_staff(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_assign_branch_staff(uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.owner_update_branch_staff(
  p_branch_staff_id uuid,
  p_is_active boolean DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_staff public.branch_staff%ROWTYPE;
  v_owner_id uuid;
  v_business_id uuid;
  v_next_role text;
  v_business_role public.business_role;
BEGIN
  SELECT bs.* INTO v_staff
  FROM public.branch_staff bs
  JOIN public.business_branches bb ON bb.id = bs.branch_id
  WHERE bs.id = p_branch_staff_id AND bb.deleted_at IS NULL;

  SELECT bb.owner_id INTO v_owner_id
  FROM public.business_branches bb
  WHERE bb.id = v_staff.branch_id;

  IF v_staff.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Mfanyakazi wa tawi hajapatikana');
  END IF;
  IF v_actor <> v_owner_id AND NOT public.has_role(v_actor, 'super_admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kubadilisha mfanyakazi huyu');
  END IF;

  v_next_role := COALESCE(p_role, v_staff.role);
  IF v_next_role NOT IN ('manager', 'staff') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_role', 'message', 'Jukumu la mfanyakazi halitambuliki');
  END IF;

  v_business_id := public.ensure_owner_business(v_owner_id);
  v_business_role := CASE WHEN v_next_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'salesperson'::public.business_role END;

  UPDATE public.branch_staff
  SET role = v_next_role,
      is_active = COALESCE(p_is_active, is_active),
      removed_at = CASE WHEN COALESCE(p_is_active, is_active) THEN NULL ELSE now() END,
      removed_by = CASE WHEN COALESCE(p_is_active, is_active) THEN NULL ELSE v_actor END,
      removal_reason = CASE WHEN COALESCE(p_is_active, is_active) THEN NULL ELSE 'deactivated' END,
      updated_at = now()
  WHERE id = p_branch_staff_id;

  UPDATE public.business_members
  SET is_active = false, branch_id = NULL, updated_at = now()
  WHERE business_id = v_business_id AND user_id = v_staff.user_id
    AND role IN ('branch_manager'::public.business_role, 'salesperson'::public.business_role);

  IF COALESCE(p_is_active, v_staff.is_active) THEN
    INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
    VALUES (v_business_id, v_staff.user_id, v_business_role, v_staff.branch_id, v_actor, true)
    ON CONFLICT (business_id, user_id, role) DO UPDATE
    SET branch_id = EXCLUDED.branch_id, invited_by = EXCLUDED.invited_by,
        is_active = true, updated_at = now();
  END IF;

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_branch_staff_id::text,
    CASE WHEN p_role IS NOT NULL THEN 'ROLE_UPDATE' WHEN p_is_active THEN 'REACTIVATE' ELSE 'DEACTIVATE' END,
    'Branch staff assignment updated',
    jsonb_build_object('user_id', v_staff.user_id, 'branch_id', v_staff.branch_id, 'role', v_next_role, 'is_active', COALESCE(p_is_active, v_staff.is_active)));

  RETURN json_build_object('success', true, 'branch_staff_id', p_branch_staff_id, 'role', v_next_role, 'is_active', COALESCE(p_is_active, v_staff.is_active));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;

REVOKE ALL ON FUNCTION public.owner_update_branch_staff(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_update_branch_staff(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_update_branch_staff(uuid, boolean, text) TO service_role;