DROP POLICY IF EXISTS "Signed-in users read catalog" ON public.catalog_items;
CREATE POLICY "Super admins read catalog" ON public.catalog_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE OR REPLACE FUNCTION public.lookup_catalog_barcode(p_barcode text)
RETURNS TABLE(name text, sector text, category text, brand text, variant_name text, unit_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.name, c.sector, c.category, c.brand, c.variant_name, c.unit_type
  FROM public.catalog_items c
  WHERE auth.uid() IS NOT NULL AND c.barcode = btrim(p_barcode)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.lookup_catalog_barcode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_catalog_barcode(text) TO authenticated;