CREATE OR REPLACE FUNCTION public.ensure_owner_business(_owner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_name text;
BEGIN
  SELECT bm.business_id INTO v_business_id
  FROM public.business_members bm
  WHERE bm.user_id = _owner_id AND bm.role = 'owner'::public.business_role
  ORDER BY bm.created_at
  LIMIT 1;

  IF v_business_id IS NOT NULL THEN
    RETURN v_business_id;
  END IF;

  SELECT COALESCE(NULLIF(trim(p.business_name), ''), NULLIF(trim(p.full_name), ''), p.email, 'Biashara Yangu')
  INTO v_name
  FROM public.profiles p
  WHERE p.id = _owner_id;

  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.created_by = _owner_id
  ORDER BY b.created_at
  LIMIT 1;

  IF v_business_id IS NULL THEN
    INSERT INTO public.businesses (name, created_by)
    VALUES (v_name, _owner_id)
    RETURNING id INTO v_business_id;
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role, is_active)
  VALUES (v_business_id, _owner_id, 'owner'::public.business_role, true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE
  SET is_active = true, updated_at = now();

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_owner_business(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_owner_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_owner_business(uuid) TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT ur.user_id
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'owner'::public.app_role
      AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.user_id = ur.user_id AND bm.role = 'owner'::public.business_role
      )
  LOOP
    PERFORM public.ensure_owner_business(r.user_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_business_id_from_owner(_owner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT bm.business_id INTO v_business_id
  FROM public.business_members bm
  WHERE bm.user_id = _owner_id AND bm.role = 'owner'::public.business_role AND bm.is_active = true
  ORDER BY bm.created_at
  LIMIT 1;

  IF v_business_id IS NULL AND (_owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    v_business_id := public.ensure_owner_business(_owner_id);
  END IF;

  RETURN v_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_assign_branch_staff(p_branch_id uuid, p_user_id uuid, p_role text DEFAULT 'staff', p_notes text DEFAULT NULL)
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
BEGIN
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
      removal_reason = CASE WHEN bs.branch_id = p_branch_id THEN 'reassigned_to_same_branch' ELSE 'transferred_to_other_branch' END,
      updated_at = now()
  WHERE bs.user_id = p_user_id
    AND bs.branch_id IN (SELECT id FROM public.business_branches WHERE owner_id = v_owner_id)
    AND bs.is_active = true;

  INSERT INTO public.branch_staff (branch_id, user_id, role, assigned_by, notes, is_active, removed_at, removed_by, removal_reason)
  VALUES (p_branch_id, p_user_id, COALESCE(NULLIF(p_role, ''), 'staff'), v_actor, p_notes, true, NULL, NULL, NULL)
  ON CONFLICT (branch_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, notes = EXCLUDED.notes, is_active = true,
      removed_at = NULL, removed_by = NULL, removal_reason = NULL, updated_at = now();

  INSERT INTO public.business_members (business_id, user_id, role, branch_id, invited_by, is_active)
  VALUES (v_business_id, p_user_id,
          CASE WHEN p_role = 'manager' THEN 'branch_manager'::public.business_role ELSE 'salesperson'::public.business_role END,
          p_branch_id, v_actor, true)
  ON CONFLICT (business_id, user_id, role) DO UPDATE
  SET branch_id = EXCLUDED.branch_id, is_active = true, updated_at = now();

  PERFORM public.audit_delete_attempt(v_business_id, v_actor, 'branch_staff', p_user_id::text,
    CASE WHEN v_previous_branch IS NULL THEN 'ASSIGN' ELSE 'TRANSFER' END,
    format('Mfanyakazi %s amepewa tawi %s', v_profile_name, v_new_branch_name),
    jsonb_build_object('branch_id', p_branch_id, 'previous_branch_id', v_previous_branch, 'role', p_role));

  RETURN json_build_object('success', true, 'business_id', v_business_id, 'branch_id', p_branch_id, 'user_id', p_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM, 'details', public.format_delete_error(SQLSTATE, SQLERRM));
END;
$$;