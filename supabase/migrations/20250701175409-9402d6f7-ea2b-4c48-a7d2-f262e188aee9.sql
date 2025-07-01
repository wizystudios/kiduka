
-- Fix the infinite recursion in profiles table policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new, simpler policies without recursion
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Fix products table policies to avoid recursion
DROP POLICY IF EXISTS "Users can view products from their business" ON public.products;
DROP POLICY IF EXISTS "Only owners can manage products" ON public.products;

CREATE POLICY "Users can view products from their business" 
  ON public.products 
  FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'assistant'
    )
  );

CREATE POLICY "Only owners can manage products" 
  ON public.products 
  FOR ALL 
  USING (
    owner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- Fix sales table policies
DROP POLICY IF EXISTS "Users can view sales from their business" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;

CREATE POLICY "Users can view sales from their business" 
  ON public.sales 
  FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'assistant'
    )
  );

CREATE POLICY "Users can create sales" 
  ON public.sales 
  FOR INSERT 
  WITH CHECK (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'assistant'
    )
  );

-- Fix sale_items table policies
DROP POLICY IF EXISTS "Users can view sale items from their business" ON public.sale_items;
DROP POLICY IF EXISTS "Users can create sale items" ON public.sale_items;

CREATE POLICY "Users can view sale items from their business" 
  ON public.sale_items 
  FOR SELECT 
  USING (
    sale_id IN (
      SELECT id FROM public.sales 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sale items" 
  ON public.sale_items 
  FOR INSERT 
  WITH CHECK (
    sale_id IN (
      SELECT id FROM public.sales 
      WHERE owner_id = auth.uid()
    )
  );
