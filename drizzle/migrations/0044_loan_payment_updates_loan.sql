CREATE OR REPLACE FUNCTION public.apply_loan_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT * INTO l FROM public.micro_loans WHERE id = NEW.loan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mkopo haupo'; END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount > coalesce(l.balance,0) THEN
    RAISE EXCEPTION 'Malipo yanazidi deni la mkopo';
  END IF;
  UPDATE public.micro_loans
     SET amount_paid = coalesce(amount_paid,0) + NEW.amount,
         balance = coalesce(balance,0) - NEW.amount,
         status = CASE WHEN coalesce(balance,0) - NEW.amount <= 0 THEN 'paid' ELSE status END
   WHERE id = l.id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_loan_payment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_apply_loan_payment ON public.loan_payments;
CREATE TRIGGER trg_apply_loan_payment BEFORE INSERT ON public.loan_payments
FOR EACH ROW EXECUTE FUNCTION public.apply_loan_payment();
-- Backfill: sync existing loans with recorded payments
UPDATE public.micro_loans m SET amount_paid = p.total, balance = greatest(m.total_amount - p.total, 0),
  status = CASE WHEN m.total_amount - p.total <= 0 THEN 'paid' ELSE m.status END
FROM (SELECT loan_id, sum(amount) total FROM public.loan_payments GROUP BY loan_id) p
WHERE p.loan_id = m.id AND coalesce(m.amount_paid,0) < p.total;