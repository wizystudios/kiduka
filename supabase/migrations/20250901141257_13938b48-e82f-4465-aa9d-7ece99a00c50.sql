-- Update RLS policy for products table to allow super admins to manage products
DROP POLICY IF EXISTS "Only owners can manage products" ON public.products;

-- Create new policy that allows both owners and super admins to manage products
CREATE POLICY "Owners and super admins can manage products" 
ON public.products 
FOR ALL 
USING (
  (owner_id = auth.uid() AND is_owner()) OR 
  is_super_admin()
);

-- Also update the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view products from their business" ON public.products;

CREATE POLICY "Users can view products from their business" 
ON public.products 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  is_assistant() OR 
  is_super_admin()
);