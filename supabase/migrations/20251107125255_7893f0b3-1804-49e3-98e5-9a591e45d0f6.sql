-- Add cost_price to products for profit/loss calculations
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Optional: ensure updated_at is maintained by existing trigger function if used elsewhere
-- (No additional trigger added here to avoid altering existing setup)

-- Create index to speed up product lookups by id
CREATE INDEX IF NOT EXISTS idx_products_id ON public.products (id);
