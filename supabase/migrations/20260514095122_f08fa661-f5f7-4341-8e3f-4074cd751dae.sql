-- Bug reports submitted from Mobile QA page
CREATE TABLE IF NOT EXISTS public.qa_bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  screenshot_urls text[] DEFAULT '{}',
  user_agent text,
  viewport text,
  console_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view own bugs"
  ON public.qa_bug_reports FOR SELECT
  USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can create bugs"
  ON public.qa_bug_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admin can update bugs"
  ON public.qa_bug_reports FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_qa_bug_reports_updated_at
  BEFORE UPDATE ON public.qa_bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for QA screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('qa-screenshots', 'qa-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read qa screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qa-screenshots');

CREATE POLICY "Auth upload qa screenshots in own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'qa-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner delete own qa screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'qa-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );