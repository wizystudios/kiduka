
-- Admin password storage (single row, super-admin shared secret for sensitive actions)
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  id integer PRIMARY KEY DEFAULT 1,
  password_hash text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_secrets_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read admin secret"
ON public.admin_secrets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can manage admin secret"
ON public.admin_secrets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Attempt log for lockout
CREATE TABLE IF NOT EXISTS public.admin_password_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  success boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_pw_attempts_admin_time
  ON public.admin_password_attempts(admin_id, attempted_at DESC);

GRANT SELECT, INSERT ON public.admin_password_attempts TO authenticated;
GRANT ALL ON public.admin_password_attempts TO service_role;

ALTER TABLE public.admin_password_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view admin password attempts"
ON public.admin_password_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- pgcrypto for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- has_admin_password_set: lets the UI decide whether to ask for current password or to set a new one
CREATE OR REPLACE FUNCTION public.has_admin_password_set()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_secrets WHERE id = 1);
$$;

-- set_admin_password: super-admin sets/changes the password. If one exists, p_current_password must verify.
CREATE OR REPLACE FUNCTION public.set_admin_password(p_new_password text, p_current_password text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'weak_password');
  END IF;

  SELECT password_hash INTO v_existing_hash FROM public.admin_secrets WHERE id = 1;

  IF v_existing_hash IS NOT NULL THEN
    IF p_current_password IS NULL OR crypt(p_current_password, v_existing_hash) <> v_existing_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'current_password_invalid');
    END IF;
  END IF;

  INSERT INTO public.admin_secrets (id, password_hash, updated_by, updated_at)
  VALUES (1, crypt(p_new_password, gen_salt('bf', 10)), auth.uid(), now())
  ON CONFLICT (id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- verify_admin_password: returns success/error + lockout info
CREATE OR REPLACE FUNCTION public.verify_admin_password(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_recent_failures int;
  v_last_failure timestamptz;
  v_lock_until timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Lockout: 5 failed attempts within 15 minutes -> locked for 30 minutes from last failure
  SELECT count(*), max(attempted_at)
    INTO v_recent_failures, v_last_failure
  FROM public.admin_password_attempts
  WHERE admin_id = v_uid
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF v_recent_failures >= 5 THEN
    v_lock_until := v_last_failure + interval '30 minutes';
    IF v_lock_until > now() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'locked',
        'retry_after_seconds', EXTRACT(EPOCH FROM (v_lock_until - now()))::int
      );
    END IF;
  END IF;

  SELECT password_hash INTO v_hash FROM public.admin_secrets WHERE id = 1;

  IF v_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_set');
  END IF;

  IF crypt(p_password, v_hash) = v_hash THEN
    INSERT INTO public.admin_password_attempts (admin_id, success) VALUES (v_uid, true);
    RETURN jsonb_build_object('success', true);
  ELSE
    INSERT INTO public.admin_password_attempts (admin_id, success) VALUES (v_uid, false);
    RETURN jsonb_build_object('success', false, 'error', 'invalid');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_admin_password_set() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO authenticated;
