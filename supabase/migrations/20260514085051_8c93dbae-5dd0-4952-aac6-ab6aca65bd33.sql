ALTER TABLE public.sokoni_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.sokoni_orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.sokoni_orders ADD COLUMN IF NOT EXISTS email_consent boolean NOT NULL DEFAULT false;