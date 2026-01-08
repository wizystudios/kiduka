-- Add is_archived column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Update foreign key constraints to SET NULL on delete (allows product deletion without affecting sales history)
-- First drop existing constraints
ALTER TABLE public.sales_items 
DROP CONSTRAINT IF EXISTS sales_items_product_id_fkey;

ALTER TABLE public.inventory_movements 
DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;

ALTER TABLE public.inventory_snapshots 
DROP CONSTRAINT IF EXISTS inventory_snapshots_product_id_fkey;

ALTER TABLE public.sales_predictions 
DROP CONSTRAINT IF EXISTS sales_predictions_product_id_fkey;

-- Re-add constraints with ON DELETE SET NULL
ALTER TABLE public.sales_items 
ADD CONSTRAINT sales_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT inventory_movements_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_snapshots 
ADD CONSTRAINT inventory_snapshots_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.sales_predictions 
ADD CONSTRAINT sales_predictions_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Make product_id nullable in tables that reference products
ALTER TABLE public.sales_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN product_id DROP NOT NULL;

-- Add index for archived products filter
CREATE INDEX IF NOT EXISTS idx_products_archived ON public.products(is_archived);
CREATE INDEX IF NOT EXISTS idx_products_owner_archived ON public.products(owner_id, is_archived);