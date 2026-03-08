
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  locked_until timestamp with time zone,
  locked_by text DEFAULT 'system',
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX login_attempts_email_idx ON public.login_attempts (email);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage login attempts" ON public.login_attempts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
