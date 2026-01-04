-- Fix marketplace_listings RLS to allow assistants to publish on behalf of owner
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;

-- Create new policies using can_access_owner_data
CREATE POLICY "Users can insert accessible listings"
ON public.marketplace_listings
FOR INSERT
WITH CHECK (can_access_owner_data(seller_id));

CREATE POLICY "Users can update accessible listings"
ON public.marketplace_listings
FOR UPDATE
USING (can_access_owner_data(seller_id));

CREATE POLICY "Users can delete accessible listings"
ON public.marketplace_listings
FOR DELETE
USING (can_access_owner_data(seller_id));