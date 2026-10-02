CREATE OR REPLACE FUNCTION public.assign_current_user_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_branch uuid;
BEGIN
  IF NEW.branch_id IS NOT NULL OR auth.uid() IS NULL OR NEW.owner_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT bm.branch_id
  INTO assigned_branch
  FROM public.business_members bm
  WHERE bm.user_id = auth.uid()
    AND bm.is_active = true
    AND bm.branch_id IS NOT NULL
    AND (NEW.business_id IS NULL OR bm.business_id = NEW.business_id)
  ORDER BY bm.updated_at DESC
  LIMIT 1;

  IF assigned_branch IS NULL THEN
    SELECT bs.branch_id
    INTO assigned_branch
    FROM public.branch_staff bs
    JOIN public.business_branches bb ON bb.id = bs.branch_id
    WHERE bs.user_id = auth.uid()
      AND bs.is_active = true
      AND bb.owner_id = NEW.owner_id
    ORDER BY bs.updated_at DESC
    LIMIT 1;
  END IF;

  IF assigned_branch IS NOT NULL THEN
    NEW.branch_id := assigned_branch;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_branch_products ON public.products;
CREATE TRIGGER trg_assign_branch_products BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();
DROP TRIGGER IF EXISTS trg_assign_branch_sales ON public.sales;
CREATE TRIGGER trg_assign_branch_sales BEFORE INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();
DROP TRIGGER IF EXISTS trg_assign_branch_customers ON public.customers;
CREATE TRIGGER trg_assign_branch_customers BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();
DROP TRIGGER IF EXISTS trg_assign_branch_expenses ON public.expenses;
CREATE TRIGGER trg_assign_branch_expenses BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();
DROP TRIGGER IF EXISTS trg_assign_branch_inventory_movements ON public.inventory_movements;
CREATE TRIGGER trg_assign_branch_inventory_movements BEFORE INSERT OR UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();
DROP TRIGGER IF EXISTS trg_assign_branch_invoices ON public.invoices;
CREATE TRIGGER trg_assign_branch_invoices BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_current_user_branch();