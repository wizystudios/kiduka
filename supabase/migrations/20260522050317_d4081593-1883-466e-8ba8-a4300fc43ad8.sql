
-- 1) user_subscriptions: drop self-UPDATE (changes must go via approve_user_subscription RPC / admin)
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

-- 2) businesses: hide sensitive compliance columns from authenticated members.
-- Column-level REVOKE blocks SELECT of these columns by the authenticated role
-- regardless of RLS row visibility. Owners should use business_compliance table.
REVOKE SELECT (nida_number, tin_number, business_license)
  ON public.businesses FROM authenticated, anon;

-- 3) loan_payments: extend access to authorized assistants via can_access_owner_data
DROP POLICY IF EXISTS "Users can view payments for their loans" ON public.loan_payments;
DROP POLICY IF EXISTS "Users can create payments for their loans" ON public.loan_payments;

CREATE POLICY "Authorized users can view loan payments"
  ON public.loan_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.micro_loans ml
      WHERE ml.id = loan_payments.loan_id
        AND public.can_access_owner_data(ml.owner_id)
    )
  );

CREATE POLICY "Authorized users can create loan payments"
  ON public.loan_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.micro_loans ml
      WHERE ml.id = loan_payments.loan_id
        AND public.can_access_owner_data(ml.owner_id)
    )
  );

-- 4) Recreate public marketplace views as SECURITY INVOKER
ALTER VIEW IF EXISTS public.public_storefronts SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_marketplace_products SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_product_reviews SET (security_invoker = true);

-- 5) Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
--    on internal helpers; keep public-facing RPCs callable.
DO $$
DECLARE
  fn record;
  keep text[] := ARRAY[
    'sokoni_register_customer',
    'sokoni_verify_pin',
    'sokoni_update_customer_name',
    'track_sokoni_order',
    'validate_coupon',
    'check_user_subscription',
    'has_role',
    'has_business_role',
    'is_business_member',
    'can_access_owner_data',
    'can_access_business_data',
    'can_access_branch',
    'get_user_role',
    'get_user_business_ids',
    'get_primary_business_id'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    IF NOT (fn.proname = ANY(keep)) THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated, public;',
        fn.proname, fn.args
      );
    ELSE
      -- Ensure public RPCs are still callable
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public;',
        fn.proname, fn.args
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated;',
        fn.proname, fn.args
      );
    END IF;
  END LOOP;
END
$$;
