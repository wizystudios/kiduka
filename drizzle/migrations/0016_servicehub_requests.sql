CREATE TABLE public.servicehub_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('booking','question')),
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
 email text NOT NULL CHECK (char_length(email) <= 254),
 phone text NOT NULL CHECK (char_length(phone) BETWEEN 9 AND 20),
 message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
 appointment_at timestamptz,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','answered','cancelled')),
 notification_status text NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending','queued','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind = 'booking' AND appointment_at IS NOT NULL) OR (kind = 'question' AND appointment_at IS NULL))
);
GRANT ALL ON public.servicehub_requests TO service_role;
REVOKE ALL ON public.servicehub_requests FROM anon, authenticated;
ALTER TABLE public.servicehub_requests ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.servicehub_requests IS 'Private public-hub inquiries; writes and email notifications handled only by the validated public submission function.';