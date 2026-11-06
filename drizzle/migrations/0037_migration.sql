ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS client_key text NOT NULL DEFAULT '';
DROP INDEX IF EXISTS public.login_attempts_email_idx;
CREATE UNIQUE INDEX login_attempts_email_client_idx ON public.login_attempts (email, client_key);