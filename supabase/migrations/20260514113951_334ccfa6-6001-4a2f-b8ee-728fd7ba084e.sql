-- Revoke EXECUTE from anon/authenticated for internal trigger and server-only helper functions.
-- These are invoked by triggers (via SECURITY DEFINER ownership) or service-role edge functions and must not be exposed via PostgREST.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.update_updated_at_column()',
    'public.update_sokoni_customer_updated_at()',
    'public.create_user_subscription()',
    'public.create_owner_contract_and_compliance()',
    'public.calculate_subscription_fee()',
    'public.set_order_tracking_code()',
    'public.auto_process_sokoni_order()',
    'public.notify_owner_email_failure()',
    'public.notify_large_transaction()',
    'public.notify_new_review()',
    'public.notify_new_return_request()',
    'public.trg_sokoni_order_owner_email()',
    'public.trg_product_low_stock_email()',
    'public.trg_sale_large_transaction_email()',
    'public.notify_owner_email(uuid, text, text, jsonb)',
    'public.delete_email(text, bigint)',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.process_sokoni_order_to_sale(uuid)',
    'public.approve_user_subscription(uuid, uuid, integer)',
    'public.generate_tracking_code()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function % not found, skipping', fn;
    END;
  END LOOP;
END $$;

-- Keep these explicitly executable by the right callers (idempotent grants):
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_owner_data(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_sokoni_order(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_assistant_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_assistant_permission_by_email(text, uuid, text) TO authenticated;