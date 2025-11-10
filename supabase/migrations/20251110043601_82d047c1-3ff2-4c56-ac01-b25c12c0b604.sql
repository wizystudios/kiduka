-- Fix infinite recursion in profiles RLS by creating security definer function
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can view all profiles direct" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles direct" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile direct" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile direct" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile direct" ON public.profiles;

-- Create security definer function to check user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Create simple, non-recursive RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Create assistant_permissions table
CREATE TABLE IF NOT EXISTS public.assistant_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_products boolean DEFAULT true,
  can_edit_products boolean DEFAULT false,
  can_delete_products boolean DEFAULT false,
  can_view_sales boolean DEFAULT true,
  can_create_sales boolean DEFAULT true,
  can_view_customers boolean DEFAULT true,
  can_edit_customers boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_view_inventory boolean DEFAULT true,
  can_edit_inventory boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(owner_id, assistant_id)
);

-- Enable RLS on assistant_permissions
ALTER TABLE public.assistant_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_permissions
CREATE POLICY "Owners can manage assistant permissions"
ON public.assistant_permissions
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Assistants can view their own permissions"
ON public.assistant_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = assistant_id);

-- Create trigger for updated_at
CREATE TRIGGER update_assistant_permissions_updated_at
BEFORE UPDATE ON public.assistant_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();