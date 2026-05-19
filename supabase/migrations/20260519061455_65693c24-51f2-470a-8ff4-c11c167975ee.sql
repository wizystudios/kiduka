
-- 1) Add business_id columns (nullable for safe rollout)
ALTER TABLE public.products  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

-- 2) Backfill from business_members (owner mapping)
UPDATE public.products p
SET business_id = bm.business_id
FROM public.business_members bm
WHERE bm.user_id = p.owner_id AND bm.role = 'owner' AND p.business_id IS NULL;

UPDATE public.sales s
SET business_id = bm.business_id
FROM public.business_members bm
WHERE bm.user_id = s.owner_id AND bm.role = 'owner' AND s.business_id IS NULL;

UPDATE public.customers c
SET business_id = bm.business_id
FROM public.business_members bm
WHERE bm.user_id = c.owner_id AND bm.role = 'owner' AND c.business_id IS NULL;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_products_business_id  ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id     ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);

-- 4) Auto-assign business_id on insert from owner_id (so new rows are tagged automatically)
CREATE OR REPLACE FUNCTION public.set_business_id_from_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.owner_id IS NOT NULL THEN
    SELECT business_id INTO NEW.business_id
    FROM public.business_members
    WHERE user_id = NEW.owner_id AND role = 'owner' AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_business_id ON public.products;
CREATE TRIGGER trg_products_business_id BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_business_id_from_owner();

DROP TRIGGER IF EXISTS trg_sales_business_id ON public.sales;
CREATE TRIGGER trg_sales_business_id BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_business_id_from_owner();

DROP TRIGGER IF EXISTS trg_customers_business_id ON public.customers;
CREATE TRIGGER trg_customers_business_id BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_business_id_from_owner();

-- 5) Additive RLS policies using business membership (run alongside existing owner_id policies)
-- products
CREATE POLICY "Business members can view products"
  ON public.products FOR SELECT
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

CREATE POLICY "Business members can insert products"
  ON public.products FOR INSERT
  WITH CHECK (business_id IS NULL OR public.can_access_business_data(business_id));

CREATE POLICY "Business members can update products"
  ON public.products FOR UPDATE
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

CREATE POLICY "Business members can delete products"
  ON public.products FOR DELETE
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

-- sales
CREATE POLICY "Business members can view sales"
  ON public.sales FOR SELECT
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

CREATE POLICY "Business members can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (business_id IS NULL OR public.can_access_business_data(business_id));

CREATE POLICY "Business members can update sales"
  ON public.sales FOR UPDATE
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

-- customers
CREATE POLICY "Business members can view customers"
  ON public.customers FOR SELECT
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

CREATE POLICY "Business members can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (business_id IS NULL OR public.can_access_business_data(business_id));

CREATE POLICY "Business members can update customers"
  ON public.customers FOR UPDATE
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));

CREATE POLICY "Business members can delete customers"
  ON public.customers FOR DELETE
  USING (business_id IS NOT NULL AND public.can_access_business_data(business_id));
