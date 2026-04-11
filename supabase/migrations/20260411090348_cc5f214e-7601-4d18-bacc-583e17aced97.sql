-- Add location fields to sokoni_customers table
ALTER TABLE public.sokoni_customers 
  ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS district text DEFAULT NULL;