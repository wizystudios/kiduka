ALTER TABLE public.invoices ADD CONSTRAINT invoices_sale_id_key UNIQUE (sale_id);
DROP INDEX IF EXISTS public.invoices_one_per_sale_idx;