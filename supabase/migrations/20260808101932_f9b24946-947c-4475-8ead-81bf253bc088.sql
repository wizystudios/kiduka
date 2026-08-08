DROP POLICY IF EXISTS "Business members can insert customers" ON public.customers;
CREATE POLICY "Business members can insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_owner_data(owner_id)
  AND (business_id IS NULL OR public.can_access_business_data(business_id))
);

DROP POLICY IF EXISTS "Business members can insert products" ON public.products;
CREATE POLICY "Business members can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_owner_data(owner_id)
  AND (business_id IS NULL OR public.can_access_business_data(business_id))
);

DROP POLICY IF EXISTS "Business members can insert sales" ON public.sales;
CREATE POLICY "Business members can insert sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_owner_data(owner_id)
  AND (business_id IS NULL OR public.can_access_business_data(business_id))
);