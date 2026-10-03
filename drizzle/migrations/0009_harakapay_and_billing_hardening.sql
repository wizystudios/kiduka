-- Billing prices are only readable by super admins; owners get prices through the
-- security-definer bill functions (get_my_billing / preview_business_billing).
DROP POLICY IF EXISTS "Anyone signed in reads billing settings" ON public.billing_settings;
CREATE POLICY "Super admin reads billing settings" ON public.billing_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- compute_business_billing takes any owner id; only server code may call it directly.
REVOKE EXECUTE ON FUNCTION public.compute_business_billing(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_business_billing(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_my_billing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_billing() TO authenticated, service_role;

-- Allow recording provider amount mismatches.
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_status_check
  CHECK (status = ANY (ARRAY['pending','processing','completed','failed','cancelled','amount_mismatch']));

-- Owners may only create unconfirmed manual-proof records; confirmed payments come from the server.
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payment_transactions;
CREATE POLICY "Users can insert own payments" ON public.payment_transactions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND status = 'pending' AND paid_amount IS NULL
    AND confirmed_at IS NULL AND provider = 'manual'
  );