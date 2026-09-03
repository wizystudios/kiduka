CREATE OR REPLACE FUNCTION public.next_invoice_number(_owner_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'INV-' || to_char(now(), 'YYMM') || '-' ||
         lpad(((SELECT count(*) FROM public.invoices WHERE owner_id = _owner_id) + 1)::text, 4, '0');
$$;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid) FROM anon;