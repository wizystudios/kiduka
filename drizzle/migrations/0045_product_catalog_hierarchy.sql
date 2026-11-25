ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sector text, ADD COLUMN IF NOT EXISTS brand text;
CREATE INDEX IF NOT EXISTS products_owner_sector_category_idx ON public.products(owner_id, sector, category);

CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  sector text,
  category text,
  brand text,
  variant_name text,
  unit_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_items_barcode_format CHECK (barcode ~ '^[0-9A-Za-z-]{6,32}$'),
  CONSTRAINT catalog_items_name_len CHECK (char_length(name) BETWEEN 1 AND 160)
);
GRANT SELECT, INSERT ON public.catalog_items TO authenticated;
GRANT UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read catalog" ON public.catalog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users contribute catalog" ON public.catalog_items FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Super admins update catalog" ON public.catalog_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete catalog" ON public.catalog_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();