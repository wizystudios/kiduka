-- Change quantity from integer to numeric to support weight-based products
ALTER TABLE public.sale_items 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;