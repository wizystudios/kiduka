-- Email consent + email assets bucket
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_consent jsonb NOT NULL DEFAULT '{"security":true,"operations":true,"subscription":true,"marketplace":true}'::jsonb;

ALTER TABLE public.sokoni_customers
  ADD COLUMN IF NOT EXISTS email_transactional_consent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_marketing_consent boolean NOT NULL DEFAULT false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read email assets') THEN
    CREATE POLICY "Public read email assets" ON storage.objects
      FOR SELECT USING (bucket_id = 'email-assets');
  END IF;
END$$;