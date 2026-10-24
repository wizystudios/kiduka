CREATE OR REPLACE FUNCTION public.assistant_can(p_owner_id uuid, p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR auth.uid() = p_owner_id OR public.has_role(auth.uid(), 'super_admin') THEN true
    WHEN NOT EXISTS (SELECT 1 FROM public.assistant_permissions ap WHERE ap.assistant_id = auth.uid() AND ap.owner_id = p_owner_id) THEN true
    ELSE COALESCE((SELECT CASE WHEN p_key LIKE 'can\_%' THEN (to_jsonb(ap) ->> p_key)::boolean ELSE (ap.extra_permissions ->> p_key)::boolean END
                   FROM public.assistant_permissions ap WHERE ap.assistant_id = auth.uid() AND ap.owner_id = p_owner_id AND ap.is_active LIMIT 1), false)
  END
$$;
GRANT EXECUTE ON FUNCTION public.assistant_can(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_assistant_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text := CASE WHEN TG_OP = 'DELETE' THEN TG_ARGV[1] ELSE TG_ARGV[0] END;
BEGIN
  IF k IS NOT NULL AND k <> '' AND NOT public.assistant_can(OLD.owner_id, k) THEN
    RAISE EXCEPTION 'Huna ruhusa ya kufanya kitendo hiki' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS guard_assistant_invoices ON public.invoices;
CREATE TRIGGER guard_assistant_invoices BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('invoices_edit', 'invoices_delete');
DROP TRIGGER IF EXISTS guard_assistant_expenses ON public.expenses;
CREATE TRIGGER guard_assistant_expenses BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('expenses_delete', 'expenses_delete');
DROP TRIGGER IF EXISTS guard_assistant_products ON public.products;
CREATE TRIGGER guard_assistant_products BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('', 'can_delete_products');
DROP TRIGGER IF EXISTS guard_assistant_customers ON public.customers;
CREATE TRIGGER guard_assistant_customers BEFORE DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.guard_assistant_action('', 'customers_delete');