
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Tanzania',
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS ward text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS location_set boolean DEFAULT false;
