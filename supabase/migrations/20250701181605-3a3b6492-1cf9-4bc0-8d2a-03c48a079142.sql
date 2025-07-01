
-- Create security definer functions to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_assistant()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'assistant';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view products from their business" ON public.products;
DROP POLICY IF EXISTS "Only owners can manage products" ON public.products;
DROP POLICY IF EXISTS "Super admin can manage all products" ON public.products;

-- Create new policies using security definer functions
CREATE POLICY "Users can view products from their business" 
  ON public.products 
  FOR SELECT 
  USING (owner_id = auth.uid() OR public.is_assistant());

CREATE POLICY "Only owners can manage products" 
  ON public.products 
  FOR ALL 
  USING (owner_id = auth.uid() AND public.is_owner());

-- Fix sales policies
DROP POLICY IF EXISTS "Users can view sales from their business" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Super admin can view all sales" ON public.sales;

CREATE POLICY "Users can view sales from their business" 
  ON public.sales 
  FOR SELECT 
  USING (owner_id = auth.uid() OR public.is_assistant());

CREATE POLICY "Users can create sales" 
  ON public.sales 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid() OR public.is_assistant());

-- Fix customers policies
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage their customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Super admin can manage all customers" ON public.customers;

CREATE POLICY "Users can manage customers" 
  ON public.customers 
  FOR ALL 
  USING (true);

-- Fix discounts policies  
DROP POLICY IF EXISTS "Users can view discounts" ON public.discounts;
DROP POLICY IF EXISTS "Users can manage discounts" ON public.discounts;
DROP POLICY IF EXISTS "Users can insert discounts" ON public.discounts;
DROP POLICY IF EXISTS "Users can update discounts" ON public.discounts;
DROP POLICY IF EXISTS "Users can delete discounts" ON public.discounts;
DROP POLICY IF EXISTS "Super admin can manage all discounts" ON public.discounts;

CREATE POLICY "Users can manage discounts" 
  ON public.discounts 
  FOR ALL 
  USING (true);
