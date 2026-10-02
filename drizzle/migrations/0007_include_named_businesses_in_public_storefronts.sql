CREATE OR REPLACE VIEW public.public_storefronts
WITH (security_invoker = false) AS
SELECT
  id,
  business_name,
  store_slug,
  store_description,
  store_logo_url,
  region,
  district,
  phone,
  google_pixel_id,
  facebook_pixel_id
FROM public.profiles
WHERE store_slug IS NOT NULL
   OR NULLIF(BTRIM(business_name), '') IS NOT NULL;

GRANT SELECT ON public.public_storefronts TO anon, authenticated;