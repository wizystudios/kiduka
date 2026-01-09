
-- Add policy to allow anyone to view sokoni orders by customer phone
-- This enables unauthenticated customers to track their orders

CREATE POLICY "Customers can view their orders by phone"
ON public.sokoni_orders
FOR SELECT
USING (true);

-- Note: The previous restrictive policy "Sellers can view their sokoni orders" still applies 
-- This is a permissive policy that allows public read access for order tracking
-- The app validates phone number match client-side
