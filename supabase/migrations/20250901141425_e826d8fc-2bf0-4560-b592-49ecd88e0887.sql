-- Ensure idempotency: drop and recreate policies
DROP POLICY IF EXISTS "Owners and super admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Owners and super admins can update products" ON public.products;
DROP POLICY IF EXISTS "Owners and super admins can delete products" ON public.products;

-- INSERT policy with proper WITH CHECK
CREATE POLICY "Owners and super admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
);

-- UPDATE policy with USING and WITH CHECK
CREATE POLICY "Owners and super admins can update products"
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
CREATE POLICY "Owners and super admins can delete products"
ON public.products
FOR DELETE
USING (
  (owner_id = auth.uid() AND is_owner())
  OR is_super_admin()
);
