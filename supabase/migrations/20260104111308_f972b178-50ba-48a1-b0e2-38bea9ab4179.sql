-- Add RLS policy for public product viewing on Sokoni (read-only for marketplace)
CREATE POLICY "Anyone can view products for marketplace" 
ON public.products 
FOR SELECT 
USING (stock_quantity > 0);

-- Note: This adds public read access for products with stock > 0
-- Other policies (insert, update, delete) remain owner-only