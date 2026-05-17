
-- Owner payment (lipa) numbers
CREATE TABLE IF NOT EXISTS public.owner_payment_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  network text NOT NULL CHECK (network IN ('mpesa','tigopesa','airtelmoney','halopesa','azampesa','other')),
  lipa_namba text NOT NULL,
  account_name text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, network, lipa_namba)
);

ALTER TABLE public.owner_payment_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own payment numbers"
  ON public.owner_payment_numbers
  FOR ALL
  TO authenticated
  USING (public.can_access_owner_data(owner_id))
  WITH CHECK (public.can_access_owner_data(owner_id));

CREATE POLICY "Super admin manages all payment numbers"
  ON public.owner_payment_numbers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_owner_payment_numbers_updated_at
  BEFORE UPDATE ON public.owner_payment_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Speed up date-range filters
CREATE INDEX IF NOT EXISTS idx_sales_owner_created
  ON public.sales (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_tx_owner_date
  ON public.customer_transactions (owner_id, transaction_date DESC);
