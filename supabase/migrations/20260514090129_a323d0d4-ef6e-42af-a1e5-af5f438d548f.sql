-- 1) Add search_path to email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions;

-- 2) Revoke EXECUTE from anon/public/authenticated on SECURITY DEFINER helpers
--    that should never be invoked directly by clients (triggers + internal admin RPCs).
--    Keep service_role access (default).

-- Trigger functions: only fire from triggers, never callable by clients
REVOKE EXECUTE ON FUNCTION public.notify_owner_email(uuid, text, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sale_large_transaction_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_product_low_stock_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sokoni_order_owner_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_large_transaction() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_review() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_return_request() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_subscription() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_owner_contract_and_compliance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_subscription_fee() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_tracking_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_sokoni_customer_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_process_sokoni_order() FROM anon, authenticated, PUBLIC;

-- Internal helpers: only used server-side / by other SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_sokoni_order_to_sale(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_assistant_permission(uuid, uuid, text) FROM anon, authenticated, PUBLIC;

-- Email queue RPCs: only the dispatcher edge function (service_role) should call these
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;