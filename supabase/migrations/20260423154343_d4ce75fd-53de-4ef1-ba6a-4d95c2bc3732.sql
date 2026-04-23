
CREATE TABLE IF NOT EXISTS public.nurath_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  transcript TEXT,
  command TEXT,
  response TEXT,
  api_latency_ms INTEGER,
  wake_triggered BOOLEAN,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nurath_logs_user_created_idx ON public.nurath_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nurath_logs_created_idx ON public.nurath_logs (created_at DESC);

ALTER TABLE public.nurath_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own nurath logs"
  ON public.nurath_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own nurath logs or admin views all"
  ON public.nurath_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete nurath logs"
  ON public.nurath_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
