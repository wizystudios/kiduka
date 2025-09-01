-- Fix RLS so super admins and owners can INSERT/UPDATE/DELETE products
-- INSERT policy with proper WITH CHECK
CREATE POLICY IF NOT EXISTS "Owners and super admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
);

-- UPDATE policy with USING and WITH CHECK
CREATE POLICY IF NOT EXISTS "Owners and super admins can update products"
ON public.products
FOR UPDATE
USING (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
)
WITH CHECK (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
);

-- DELETE policy
CREATE POLICY IF NOT EXISTS "Owners and super admins can delete products"
ON public.products
FOR DELETE
USING (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
);
