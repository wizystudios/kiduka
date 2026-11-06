CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL CHECK (length(session_id) BETWEEN 8 AND 64),
  path text NOT NULL CHECK (length(path) <= 200),
  referrer_host text CHECK (length(referrer_host) <= 120),
  utm_source text CHECK (length(utm_source) <= 80),
  utm_medium text CHECK (length(utm_medium) <= 80),
  utm_campaign text CHECK (length(utm_campaign) <= 120),
  device text CHECK (device IN ('mobile','desktop')),
  created_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS site_visits_created_idx ON public.site_visits (created_at DESC);--> statement-breakpoint
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT INSERT ON public.site_visits TO anon, authenticated;--> statement-breakpoint
GRANT SELECT, DELETE ON public.site_visits TO authenticated;--> statement-breakpoint
CREATE POLICY "Anyone can record a visit" ON public.site_visits FOR INSERT TO anon, authenticated WITH CHECK (created_at > now() - interval '1 minute');--> statement-breakpoint
CREATE POLICY "Super admins read visits" ON public.site_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));--> statement-breakpoint
CREATE POLICY "Super admins delete visits" ON public.site_visits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
