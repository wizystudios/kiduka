-- Add phone column to profiles table for phone login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Create an index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Add unique constraint for phone (if it has value)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;

-- Update assistant_permissions RLS to allow assistants to access owner data properly
CREATE OR REPLACE FUNCTION public.can_access_owner_data(target_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = target_owner_id OR
    EXISTS (
      SELECT 1 FROM assistant_permissions 
      WHERE assistant_id = auth.uid() 
      AND owner_id = target_owner_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    );
$$;