-- Tighten direct access to the admin password hash while keeping RPC verification working
DROP POLICY IF EXISTS "Super admin can read admin secret" ON public.admin_secrets;
DROP POLICY IF EXISTS "Super admin can manage admin secret" ON public.admin_secrets;

CREATE POLICY "No direct admin secret reads"
ON public.admin_secrets
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "No direct admin secret writes"
ON public.admin_secrets
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct admin secret updates"
ON public.admin_secrets
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Allow authenticated super admins to set/reset the secondary admin password without relying on an old hardcoded/unknown password.
CREATE OR REPLACE FUNCTION public.set_admin_password(p_new_password text, p_current_password text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password');
  END IF;

  INSERT INTO public.admin_secrets (id, password_hash, updated_by, updated_at)
  VALUES (1, crypt(p_new_password, gen_salt('bf', 10)), auth.uid(), now())
  ON CONFLICT (id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.admin_password_attempts (admin_id, success)
  VALUES (auth.uid(), true);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO authenticated;