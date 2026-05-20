-- =====================================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. SOKONI CUSTOMERS — Hash PINs, lock down access
-- =====================================================================

-- Add pin_hash column
ALTER TABLE public.sokoni_customers
  ADD COLUMN IF NOT EXISTS pin_hash text;

-- Backfill existing plaintext PINs into bcrypt hash
UPDATE public.sokoni_customers
SET pin_hash = crypt(pin, gen_salt('bf', 10))
WHERE pin IS NOT NULL AND pin_hash IS NULL;

-- Drop plaintext pin column
ALTER TABLE public.sokoni_customers DROP COLUMN IF EXISTS pin;

-- Drop unsafe policies
DROP POLICY IF EXISTS "Anyone can view sokoni customers" ON public.sokoni_customers;
DROP POLICY IF EXISTS "Anyone can create sokoni customer account" ON public.sokoni_customers;
DROP POLICY IF EXISTS "Customers can update their own account" ON public.sokoni_customers;

-- Restrict: only super_admin can SELECT/UPDATE/INSERT/DELETE directly. All
-- legitimate customer access goes through SECURITY DEFINER RPCs below.
CREATE POLICY "Super admin manages sokoni customers"
  ON public.sokoni_customers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- RPC: register a new sokoni customer
CREATE OR REPLACE FUNCTION public.sokoni_register_customer(
  p_phone text,
  p_pin text,
  p_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing uuid;
  v_id uuid;
BEGIN
  IF p_phone IS NULL OR length(p_phone) < 9 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_phone');
  END IF;
  IF p_pin IS NULL OR length(p_pin) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'weak_pin');
  END IF;

  SELECT id INTO v_existing FROM public.sokoni_customers WHERE phone = p_phone;
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_registered');
  END IF;

  INSERT INTO public.sokoni_customers (phone, name, pin_hash)
  VALUES (p_phone, p_name, crypt(p_pin, gen_salt('bf', 10)))
  RETURNING id INTO v_id;

  RETURN json_build_object(
    'success', true,
    'customer', json_build_object('id', v_id, 'phone', p_phone, 'name', p_name)
  );
END;
$$;

-- RPC: verify a sokoni customer PIN
CREATE OR REPLACE FUNCTION public.sokoni_verify_pin(
  p_phone text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.sokoni_customers%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.sokoni_customers WHERE phone = p_phone;
  IF v_row.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_row.pin_hash IS NULL THEN
    -- Legacy account without password set — allow first-time PIN set
    UPDATE public.sokoni_customers
      SET pin_hash = crypt(p_pin, gen_salt('bf', 10))
      WHERE id = v_row.id;
    RETURN json_build_object(
      'success', true,
      'first_time', true,
      'customer', json_build_object('id', v_row.id, 'phone', v_row.phone, 'name', v_row.name)
    );
  END IF;
  IF v_row.pin_hash = crypt(p_pin, v_row.pin_hash) THEN
    RETURN json_build_object(
      'success', true,
      'customer', json_build_object('id', v_row.id, 'phone', v_row.phone, 'name', v_row.name)
    );
  END IF;
  RETURN json_build_object('success', false, 'error', 'invalid_pin');
END;
$$;

-- RPC: update customer name (requires PIN)
CREATE OR REPLACE FUNCTION public.sokoni_update_customer_name(
  p_phone text,
  p_pin text,
  p_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.sokoni_customers%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.sokoni_customers WHERE phone = p_phone;
  IF v_row.id IS NULL OR v_row.pin_hash IS NULL
     OR v_row.pin_hash <> crypt(p_pin, v_row.pin_hash) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  UPDATE public.sokoni_customers SET name = p_name, updated_at = now() WHERE id = v_row.id;
  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.sokoni_register_customer(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sokoni_register_customer(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.sokoni_verify_pin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sokoni_verify_pin(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.sokoni_update_customer_name(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sokoni_update_customer_name(text, text, text) TO anon, authenticated;

-- =====================================================================
-- 2. SOKONI ORDERS — Remove public USING(true) policy
-- =====================================================================
DROP POLICY IF EXISTS "Customers can view their orders by phone" ON public.sokoni_orders;

-- Customers track orders via existing public.track_sokoni_order(phone, code) RPC.

-- =====================================================================
-- 3. RETURN REQUESTS — Remove public USING(true) policy
-- =====================================================================
DROP POLICY IF EXISTS "Customers can view own return requests" ON public.return_requests;
-- Customers can still INSERT (existing "Anyone can create return requests" policy).

-- =====================================================================
-- 4. PRODUCT REVIEWS — Hide customer_phone via view, fix broken UPDATE
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.product_reviews;

-- Sellers can view reviews on their own products
CREATE POLICY "Sellers can view reviews on their products"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_reviews.product_id
        AND public.can_access_owner_data(p.owner_id)
    )
  );

-- Public view exposing reviews without customer_phone
CREATE OR REPLACE VIEW public.public_product_reviews
WITH (security_invoker = false) AS
SELECT
  id,
  product_id,
  customer_name,
  rating,
  review_text,
  is_verified_purchase,
  created_at
FROM public.product_reviews;

GRANT SELECT ON public.public_product_reviews TO anon, authenticated;

-- =====================================================================
-- 5. PROFILES — Storefront public read via safe view
-- =====================================================================
DROP POLICY IF EXISTS "Public can view seller storefront info only" ON public.profiles;

CREATE OR REPLACE VIEW public.public_storefronts
WITH (security_invoker = false) AS
SELECT
  id,
  business_name,
  store_slug,
  store_description,
  store_logo_url,
  region,
  district,
  phone,
  google_pixel_id,
  facebook_pixel_id
FROM public.profiles
WHERE store_slug IS NOT NULL;

GRANT SELECT ON public.public_storefronts TO anon, authenticated;

-- =====================================================================
-- 6. PRODUCTS — Marketplace public read via safe view (no cost_price)
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view products for marketplace" ON public.products;

CREATE OR REPLACE VIEW public.public_marketplace_products
WITH (security_invoker = false) AS
SELECT
  id,
  name,
  price,
  description,
  category,
  stock_quantity,
  image_url,
  owner_id,
  branch_id,
  created_at
FROM public.products
WHERE stock_quantity > 0
  AND (is_archived IS NULL OR is_archived = false);

GRANT SELECT ON public.public_marketplace_products TO anon, authenticated;

-- =====================================================================
-- 7. COUPON CODES — Lock public read, expose validation RPC only
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view active coupons for validation" ON public.coupon_codes;

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric,
  p_seller_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.coupon_codes%ROWTYPE;
  v_discount numeric := 0;
BEGIN
  SELECT * INTO v_row
  FROM public.coupon_codes
  WHERE upper(code) = upper(p_code)
    AND is_active = true
    AND (p_seller_ids IS NULL OR owner_id = ANY(p_seller_ids))
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'invalid_or_inactive');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'expired');
  END IF;
  IF v_row.max_uses IS NOT NULL AND v_row.used_count >= v_row.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'exhausted');
  END IF;
  IF v_row.min_order_amount IS NOT NULL AND p_subtotal < v_row.min_order_amount THEN
    RETURN json_build_object('valid', false, 'error', 'min_order', 'min_order_amount', v_row.min_order_amount);
  END IF;

  IF v_row.discount_type = 'percentage' THEN
    v_discount := round(p_subtotal * (v_row.discount_value / 100.0));
  ELSE
    v_discount := v_row.discount_value;
  END IF;

  -- Atomically increment usage
  UPDATE public.coupon_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE id = v_row.id;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_row.id,
    'discount_amount', v_discount,
    'discount_type', v_row.discount_type,
    'discount_value', v_row.discount_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric, uuid[]) TO anon, authenticated;
