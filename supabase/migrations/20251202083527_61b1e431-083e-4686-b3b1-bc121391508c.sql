-- Create function to check if user can access owner's data
CREATE OR REPLACE FUNCTION public.can_access_owner_data(target_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = target_owner_id OR
    EXISTS (
      SELECT 1 FROM assistant_permissions 
      WHERE assistant_id = auth.uid() 
      AND owner_id = target_owner_id
    );
$$;

-- Update RLS policies for products
DROP POLICY IF EXISTS "Users can view their own products" ON products;
CREATE POLICY "Users can view accessible products" 
ON products FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert accessible products" 
ON products FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update accessible products" 
ON products FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete accessible products" 
ON products FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Users can view accessible customers" 
ON customers FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Users can insert accessible customers" 
ON customers FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Users can update accessible customers" 
ON customers FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
CREATE POLICY "Users can delete accessible customers" 
ON customers FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for sales
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
CREATE POLICY "Users can view accessible sales" 
ON sales FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
CREATE POLICY "Users can insert accessible sales" 
ON sales FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

-- Update RLS policies for expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view accessible expenses" 
ON expenses FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
CREATE POLICY "Users can insert accessible expenses" 
ON expenses FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update accessible expenses" 
ON expenses FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete accessible expenses" 
ON expenses FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for customer_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON customer_transactions;
CREATE POLICY "Users can view accessible transactions" 
ON customer_transactions FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can create their own transactions" ON customer_transactions;
CREATE POLICY "Users can create accessible transactions" 
ON customer_transactions FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own transactions" ON customer_transactions;
CREATE POLICY "Users can update accessible transactions" 
ON customer_transactions FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own transactions" ON customer_transactions;
CREATE POLICY "Users can delete accessible transactions" 
ON customer_transactions FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for micro_loans
DROP POLICY IF EXISTS "Users can view their own loans" ON micro_loans;
CREATE POLICY "Users can view accessible loans" 
ON micro_loans FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can create their own loans" ON micro_loans;
CREATE POLICY "Users can create accessible loans" 
ON micro_loans FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own loans" ON micro_loans;
CREATE POLICY "Users can update accessible loans" 
ON micro_loans FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own loans" ON micro_loans;
CREATE POLICY "Users can delete accessible loans" 
ON micro_loans FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for discounts
DROP POLICY IF EXISTS "Users can view their own discounts" ON discounts;
CREATE POLICY "Users can view accessible discounts" 
ON discounts FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can create their own discounts" ON discounts;
CREATE POLICY "Users can create accessible discounts" 
ON discounts FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own discounts" ON discounts;
CREATE POLICY "Users can update accessible discounts" 
ON discounts FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own discounts" ON discounts;
CREATE POLICY "Users can delete accessible discounts" 
ON discounts FOR DELETE 
USING (can_access_owner_data(owner_id));

-- Update RLS policies for inventory_movements
DROP POLICY IF EXISTS "Users can view their own inventory movements" ON inventory_movements;
CREATE POLICY "Users can view accessible inventory movements" 
ON inventory_movements FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert inventory movements" ON inventory_movements;
CREATE POLICY "Users can insert accessible inventory movements" 
ON inventory_movements FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

-- Update RLS policies for inventory_snapshots
DROP POLICY IF EXISTS "Users can view their own inventory snapshots" ON inventory_snapshots;
CREATE POLICY "Users can view accessible inventory snapshots" 
ON inventory_snapshots FOR SELECT 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can insert their own inventory snapshots" ON inventory_snapshots;
CREATE POLICY "Users can insert accessible inventory snapshots" 
ON inventory_snapshots FOR INSERT 
WITH CHECK (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can update their own inventory snapshots" ON inventory_snapshots;
CREATE POLICY "Users can update accessible inventory snapshots" 
ON inventory_snapshots FOR UPDATE 
USING (can_access_owner_data(owner_id));

DROP POLICY IF EXISTS "Users can delete their own inventory snapshots" ON inventory_snapshots;
CREATE POLICY "Users can delete accessible inventory snapshots" 
ON inventory_snapshots FOR DELETE 
USING (can_access_owner_data(owner_id));