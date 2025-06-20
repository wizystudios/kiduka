
-- Drop both constraints that are preventing the update
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a single new constraint that includes super_admin
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'assistant', 'super_admin'));

-- Now update the user role to super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'kharifanadhiru01@gmail.com';
