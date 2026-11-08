CREATE OR REPLACE FUNCTION public.link_credit_sale() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE matched uuid;matches integer;
BEGIN
IF NEW.sale_id IS NULL AND NEW.transaction_type='sale' AND NEW.notes LIKE 'Deni la mauzo INV-%' THEN
SELECT count(*),(array_agg(id))[1] INTO matches,matched FROM public.sales WHERE owner_id=NEW.owner_id AND customer_id=NEW.customer_id AND branch_id IS NOT DISTINCT FROM NEW.branch_id AND NEW.notes='Deni la mauzo INV-'||left(id::text,8) AND payment_details->>'debt_recorded'='true';
IF matches=1 THEN NEW.sale_id:=matched; END IF;
END IF;
IF NEW.sale_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales WHERE id=NEW.sale_id AND owner_id=NEW.owner_id AND customer_id IS NOT DISTINCT FROM NEW.customer_id AND branch_id IS NOT DISTINCT FROM NEW.branch_id) THEN RAISE EXCEPTION 'Deni halilingani na mauzo'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER link_credit_sale BEFORE INSERT OR UPDATE OF sale_id ON public.customer_transactions FOR EACH ROW EXECUTE FUNCTION public.link_credit_sale();