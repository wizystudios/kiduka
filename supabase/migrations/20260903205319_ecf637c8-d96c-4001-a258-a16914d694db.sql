CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  business_id uuid,
  invoice_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  due_date date,
  sale_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
USING (public.can_access_owner_data(owner_id));
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.can_access_owner_data(owner_id));
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated
USING (public.can_access_owner_data(owner_id))
WITH CHECK (public.can_access_owner_data(owner_id));
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
USING (public.can_access_owner_data(owner_id));

CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices(owner_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(owner_id, invoice_number);

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.next_invoice_number(_owner_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || to_char(now(), 'YYMM') || '-' ||
         lpad(((SELECT count(*) FROM public.invoices WHERE owner_id = _owner_id) + 1)::text, 4, '0');
$$;