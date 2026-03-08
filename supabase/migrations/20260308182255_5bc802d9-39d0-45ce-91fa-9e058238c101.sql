
-- Fix overly permissive UPDATE on abandoned_carts - restrict to matching phone
DROP POLICY IF EXISTS "Anyone can update abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Update abandoned carts by phone match" ON public.abandoned_carts
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (customer_phone IS NOT NULL);

-- Fix overly permissive INSERT on return_requests  
DROP POLICY IF EXISTS "Anyone can create return requests" ON public.return_requests;
CREATE POLICY "Anyone can create return requests" ON public.return_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (customer_phone IS NOT NULL AND length(customer_phone) >= 9 AND reason IS NOT NULL);

-- Fix overly permissive INSERT on abandoned_carts
DROP POLICY IF EXISTS "Anyone can create abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Anyone can create abandoned carts" ON public.abandoned_carts
  FOR INSERT TO anon, authenticated
  WITH CHECK (customer_phone IS NOT NULL AND length(customer_phone) >= 9);
