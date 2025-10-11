-- Update kharifanadhiru01@gmail.com to super_admin role
UPDATE profiles 
SET role = 'super_admin',
    full_name = 'Kharifa Nadhiru',
    business_name = 'Kiduka System Admin',
    updated_at = now()
WHERE id = 'adad74cc-6c53-4aef-bf00-7738f9a58f1c';

-- If profile doesn't exist, insert it
INSERT INTO profiles (id, email, full_name, role, business_name)
SELECT 
  'adad74cc-6c53-4aef-bf00-7738f9a58f1c',
  'kharifanadhiru01@gmail.com',
  'Kharifa Nadhiru',
  'super_admin',
  'Kiduka System Admin'
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = 'adad74cc-6c53-4aef-bf00-7738f9a58f1c'
);