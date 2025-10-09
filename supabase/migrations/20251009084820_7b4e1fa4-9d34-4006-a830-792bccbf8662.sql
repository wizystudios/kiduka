-- Add missing columns to products table for flexible business support
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS min_quantity numeric DEFAULT 0.1,
ADD COLUMN IF NOT EXISTS is_weight_based boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS variant_name text,
ADD COLUMN IF NOT EXISTS parent_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

-- Create index for better performance on variants
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON public.products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_type ON public.products(unit_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Add inventory tracking table for start/end of day counts
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('opening', 'closing')),
  quantity numeric NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on inventory_snapshots
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_snapshots
CREATE POLICY "Users can view their own inventory snapshots"
ON public.inventory_snapshots FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own inventory snapshots"
ON public.inventory_snapshots FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own inventory snapshots"
ON public.inventory_snapshots FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own inventory snapshots"
ON public.inventory_snapshots FOR DELETE
USING (auth.uid() = owner_id);

-- Create indexes for inventory snapshots
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_owner ON public.inventory_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_product ON public.inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_date ON public.inventory_snapshots(snapshot_date);

-- Add more flexible unit types as comments for reference
COMMENT ON COLUMN public.products.unit_type IS 'Unit types: piece, kg, g, liter, ml, box, pack, dozen, etc.';
COMMENT ON COLUMN public.products.variant_name IS 'For product variants like Small, Medium, Large, 330ml, 500ml, etc.';
COMMENT ON COLUMN public.products.parent_product_id IS 'Links to parent product for variants (e.g., Small Beer -> Beer base product)';