CREATE OR REPLACE FUNCTION public.claim_owner_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT public.get_user_role(v_uid) INTO v_role;
  IF v_role IS NOT NULL THEN RETURN v_role; END IF;
  -- Never promote anyone who is staff somewhere.
  IF EXISTS (SELECT 1 FROM public.assistant_permissions WHERE assistant_id = v_uid)
     OR EXISTS (SELECT 1 FROM public.branch_staff WHERE user_id = v_uid)
     OR EXISTS (SELECT 1 FROM public.business_members WHERE user_id = v_uid AND role <> 'owner') THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'owner';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_owner_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_role() TO authenticated;