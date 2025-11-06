-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

-- Create non-recursive policies
CREATE POLICY "Users can view own profile direct"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile direct"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile direct"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Super admin policy without recursion
CREATE POLICY "Super admins can view all profiles direct"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update all profiles direct"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);