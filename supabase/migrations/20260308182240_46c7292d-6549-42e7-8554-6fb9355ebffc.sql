
-- 1. Coupon codes table
CREATE TABLE public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(owner_id, code)
);

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own coupons" ON public.coupon_codes
  FOR ALL TO authenticated
  USING (can_access_owner_data(owner_id))
  WITH CHECK (can_access_owner_data(owner_id));

CREATE POLICY "Anyone can view active coupons for validation" ON public.coupon_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 2. Return requests table
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.sokoni_orders(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  customer_phone text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  refund_amount numeric DEFAULT 0,
  refund_method text DEFAULT NULL,
  seller_notes text DEFAULT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own return requests" ON public.return_requests
  FOR ALL TO authenticated
  USING (can_access_owner_data(seller_id))
  WITH CHECK (can_access_owner_data(seller_id));

CREATE POLICY "Anyone can create return requests" ON public.return_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (customer_phone IS NOT NULL AND length(customer_phone) >= 9);

CREATE POLICY "Customers can view own return requests" ON public.return_requests
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Abandoned carts table
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  customer_name text DEFAULT NULL,
  seller_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric DEFAULT 0,
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamp with time zone DEFAULT NULL,
  recovered boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create abandoned carts" ON public.abandoned_carts
  FOR INSERT TO anon, authenticated
  WITH CHECK (customer_phone IS NOT NULL);

CREATE POLICY "Sellers can view own abandoned carts" ON public.abandoned_carts
  FOR ALL TO authenticated
  USING (can_access_owner_data(seller_id))
  WITH CHECK (can_access_owner_data(seller_id));

CREATE POLICY "Anyone can update abandoned carts" ON public.abandoned_carts
  FOR UPDATE TO anon, authenticated
  USING (true);

-- 4. Storefront and pixel columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_description text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_logo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_pixel_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_pixel_id text;

-- Updated_at triggers
CREATE TRIGGER update_coupon_codes_updated_at BEFORE UPDATE ON public.coupon_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_return_requests_updated_at BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abandoned_carts_updated_at BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.return_requests;
