
-- 1) Tighten owner_payment_numbers RLS: owner-only (no assistants)
DROP POLICY IF EXISTS "Owners manage own payment numbers" ON public.owner_payment_numbers;

CREATE POLICY "Owner only - view payment numbers"
  ON public.owner_payment_numbers FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner only - insert payment numbers"
  ON public.owner_payment_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner only - update payment numbers"
  ON public.owner_payment_numbers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner only - delete payment numbers"
  ON public.owner_payment_numbers FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 2) Fix SECURITY DEFINER warning on set_sale_created_by
--    auth.uid() works under INVOKER too, so DEFINER is unnecessary here.
CREATE OR REPLACE FUNCTION public.set_sale_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
