
-- 1) business_compliance: revoke column-level SELECT on sensitive fields from anon/authenticated
REVOKE SELECT (nida_number, tin_number, business_license) ON public.business_compliance FROM anon, authenticated;

-- 2) marketplace_listings: tighten SELECT to active listings (or owner/staff)
DROP POLICY IF EXISTS "Anyone can view marketplace listings" ON public.marketplace_listings;
CREATE POLICY "View active marketplace listings"
  ON public.marketplace_listings
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR can_access_owner_data(seller_id));

-- 3) product_images: hide images for archived products from public enumeration
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "View images for non-archived products"
  ON public.product_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND COALESCE(p.is_archived, false) = false
    )
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND can_access_owner_data(p.owner_id)
    )
  );
