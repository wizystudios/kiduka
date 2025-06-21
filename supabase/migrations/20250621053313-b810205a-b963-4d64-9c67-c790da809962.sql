
-- Add RLS policies for Super Admin to access all data
-- Allow super_admin to view all profiles
CREATE POLICY "Super admin can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow super_admin to update all profiles
CREATE POLICY "Super admin can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow super_admin to delete profiles (except themselves)
CREATE POLICY "Super admin can delete profiles" 
  ON public.profiles 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) AND id != auth.uid()
  );

-- Allow super_admin to insert new profiles
CREATE POLICY "Super admin can create profiles" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin access to customer_credit
CREATE POLICY "Super admin can manage all customer credit" 
  ON public.customer_credit 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin access to customers
CREATE POLICY "Super admin can manage all customers" 
  ON public.customers 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin access to products
CREATE POLICY "Super admin can manage all products" 
  ON public.products 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin access to sales
CREATE POLICY "Super admin can view all sales" 
  ON public.sales 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin access to discounts
CREATE POLICY "Super admin can manage all discounts" 
  ON public.discounts 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Add user_admin_actions table to track admin actions
CREATE TABLE IF NOT EXISTS public.user_admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  target_user_id UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin actions
ALTER TABLE public.user_admin_actions ENABLE ROW LEVEL SECURITY;

-- Allow super admin to view all admin actions
CREATE POLICY "Super admin can view all admin actions" 
  ON public.user_admin_actions 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow super admin to insert admin actions
CREATE POLICY "Super admin can log admin actions" 
  ON public.user_admin_actions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
