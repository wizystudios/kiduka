
-- Extend nurath_logs for richer voice diagnostics
ALTER TABLE public.nurath_logs
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS lang text,
  ADD COLUMN IF NOT EXISTS utterance_id text;

CREATE INDEX IF NOT EXISTS nurath_logs_utterance_idx ON public.nurath_logs(utterance_id);

-- Allow owners to view their OWN nurath logs (admins keep global access)
DROP POLICY IF EXISTS "Users can view their own nurath logs" ON public.nurath_logs;
CREATE POLICY "Users can view their own nurath logs"
  ON public.nurath_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
