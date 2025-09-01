-- Add weight/volume selling capability to products
ALTER TABLE public.products 
ADD COLUMN is_weight_based BOOLEAN DEFAULT FALSE,
ADD COLUMN unit_type TEXT DEFAULT 'piece',
ADD COLUMN min_quantity NUMERIC DEFAULT 0.1;