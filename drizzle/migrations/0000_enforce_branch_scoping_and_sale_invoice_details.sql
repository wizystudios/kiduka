ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.business_branches(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_per_sale_idx ON public.invoices (sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_branch_id_idx ON public.invoices (branch_id);

CREATE OR REPLACE FUNCTION public.can_access_branch_data(
  _owner_id uuid,
  _business_id uuid,
  _branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _owner_id
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
        AND bm.is_active = true
        AND (_business_id IS NULL OR bm.business_id = _business_id)
        AND (
          bm.role IN ('owner'::public.business_role, 'co_owner'::public.business_role, 'accountant'::public.business_role)
          OR (bm.branch_id IS NOT NULL AND _branch_id = bm.branch_id)
          OR (bm.role = 'assistant'::public.business_role AND bm.branch_id IS NULL AND _branch_id IS NULL)
        )
    )
    OR (
      _branch_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.assistant_permissions ap
        WHERE ap.assistant_id = auth.uid()
          AND ap.owner_id = _owner_id
          AND COALESCE(ap.is_active, true) = true
          AND NOT EXISTS (
            SELECT 1 FROM public.business_members scoped
            WHERE scoped.user_id = auth.uid()
              AND scoped.is_active = true
              AND scoped.branch_id IS NOT NULL
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_branch_data(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_branch_data(uuid, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Business members can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can update customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete accessible customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert accessible customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update accessible customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view accessible customers" ON public.customers;
CREATE POLICY "Branch-scoped customers select" ON public.customers FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped customers insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped customers update" ON public.customers FOR UPDATE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id)) WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped customers delete" ON public.customers FOR DELETE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));

DROP POLICY IF EXISTS "Business members can delete products" ON public.products;
DROP POLICY IF EXISTS "Business members can insert products" ON public.products;
DROP POLICY IF EXISTS "Business members can update products" ON public.products;
DROP POLICY IF EXISTS "Business members can view products" ON public.products;
DROP POLICY IF EXISTS "Users can delete accessible products" ON public.products;
DROP POLICY IF EXISTS "Users can insert accessible products" ON public.products;
DROP POLICY IF EXISTS "Users can update accessible products" ON public.products;
DROP POLICY IF EXISTS "Users can view accessible products" ON public.products;
CREATE POLICY "Branch-scoped products select" ON public.products FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped products insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped products update" ON public.products FOR UPDATE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id)) WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped products delete" ON public.products FOR DELETE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));

DROP POLICY IF EXISTS "Business members can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Business members can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Business members can update sales" ON public.sales;
DROP POLICY IF EXISTS "Business members can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete accessible sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert accessible sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update accessible sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view accessible sales" ON public.sales;
CREATE POLICY "Branch-scoped sales select" ON public.sales FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped sales insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped sales update" ON public.sales FOR UPDATE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id)) WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped sales delete" ON public.sales FOR DELETE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));

DROP POLICY IF EXISTS "Users can delete accessible expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert accessible expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update accessible expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view accessible expenses" ON public.expenses;
CREATE POLICY "Branch-scoped expenses select" ON public.expenses FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped expenses insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped expenses update" ON public.expenses FOR UPDATE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id)) WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped expenses delete" ON public.expenses FOR DELETE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));

DROP POLICY IF EXISTS "Users can insert accessible inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Users can view accessible inventory movements" ON public.inventory_movements;
CREATE POLICY "Branch-scoped inventory select" ON public.inventory_movements FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped inventory insert" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));

DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "Branch-scoped invoices select" ON public.invoices FOR SELECT TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped invoices insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped invoices update" ON public.invoices FOR UPDATE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id)) WITH CHECK (public.can_access_branch_data(owner_id, business_id, branch_id));
CREATE POLICY "Branch-scoped invoices delete" ON public.invoices FOR DELETE TO authenticated USING (public.can_access_branch_data(owner_id, business_id, branch_id));