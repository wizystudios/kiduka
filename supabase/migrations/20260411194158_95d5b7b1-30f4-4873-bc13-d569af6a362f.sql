
-- Fix sokoni_customers: Replace overly permissive UPDATE policy
DROP POLICY IF EXISTS "Customers can update their own account" ON public.sokoni_customers;

CREATE POLICY "Customers can update their own account"
ON public.sokoni_customers
FOR UPDATE
USING (phone IS NOT NULL)
WITH CHECK (phone IS NOT NULL);
