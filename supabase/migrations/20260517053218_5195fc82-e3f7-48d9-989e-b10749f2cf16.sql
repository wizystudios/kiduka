
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE OR REPLACE FUNCTION public.set_sale_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_set_created_by ON public.sales;
CREATE TRIGGER trg_sales_set_created_by
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_sale_created_by();

CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales (created_by);
