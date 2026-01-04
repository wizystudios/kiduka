-- Fix sales_items RLS to allow assistants to insert/view
DROP POLICY IF EXISTS "Users can insert their own sales items" ON public.sales_items;
DROP POLICY IF EXISTS "Users can view their own sales items" ON public.sales_items;

-- Create policies using can_access_owner_data via the sales table
CREATE POLICY "Users can insert accessible sales items" 
ON public.sales_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sales_items.sale_id 
    AND can_access_owner_data(sales.owner_id)
  )
);

CREATE POLICY "Users can view accessible sales items" 
ON public.sales_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sales_items.sale_id 
    AND can_access_owner_data(sales.owner_id)
  )
);

-- Fix the profiles table - update the orphaned profile to use assistant ID
-- First, check if assistant already has a profile
-- If not, update the orphaned one or insert new
UPDATE public.profiles 
SET id = '592de820-ff08-470b-9472-c94f7b7c34fe',
    full_name = 'Hello',
    business_name = 'ShopWithUs',
    updated_at = now()
WHERE id = '97f3b3e2-604f-45b2-8e8c-5605d1012c89' 
AND email = 'hello@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '592de820-ff08-470b-9472-c94f7b7c34fe');