-- Create security definer function to check super admin status without recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin';
END;
$function$;

-- Drop existing super admin policies that cause recursion
DROP POLICY IF EXISTS "Super admin can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;

-- Create new super admin policies using the security definer function
CREATE POLICY "Super admin can create profiles"
ON public.profiles 
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can delete profiles"
ON public.profiles
FOR DELETE 
TO authenticated
USING (is_super_admin() AND id <> auth.uid());

CREATE POLICY "Super admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_super_admin());