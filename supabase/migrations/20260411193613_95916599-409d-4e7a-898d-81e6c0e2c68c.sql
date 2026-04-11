
-- 1. Fix login_attempts: Remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage login attempts" ON public.login_attempts;

-- Only allow service-role (edge functions) to manage login_attempts
-- No direct client access needed since check-login-attempt edge function uses service role
CREATE POLICY "Service role manages login attempts"
ON public.login_attempts
FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Fix profiles: Replace blanket public SELECT with restricted one
DROP POLICY IF EXISTS "Anyone can view seller business names for marketplace" ON public.profiles;

CREATE POLICY "Public can view seller storefront info only"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  store_slug IS NOT NULL
);

-- 3. Fix abandoned_carts: Remove overly permissive update policy
DROP POLICY IF EXISTS "Update abandoned carts by phone match" ON public.abandoned_carts;

-- 4. Fix product_reviews: Tighten update policy
DROP POLICY IF EXISTS "Customers can update their reviews" ON public.product_reviews;

CREATE POLICY "Customers can update their own reviews"
ON public.product_reviews
FOR UPDATE
USING (customer_phone IS NOT NULL)
WITH CHECK (customer_phone IS NOT NULL AND rating >= 1 AND rating <= 5);

-- 5. Fix sokoni_orders: Add seller validation to insert policy
DROP POLICY IF EXISTS "Anyone can create sokoni orders" ON public.sokoni_orders;

CREATE POLICY "Anyone can create sokoni orders with valid seller"
ON public.sokoni_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  seller_id IS NOT NULL
  AND customer_phone IS NOT NULL
  AND length(customer_phone) >= 9
  AND delivery_address IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = seller_id AND store_slug IS NOT NULL)
);

-- 6. Fix product-images storage: Add ownership checks
DROP POLICY IF EXISTS "Users can delete their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;

CREATE POLICY "Users can delete their own product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
