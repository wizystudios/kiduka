DROP POLICY IF EXISTS "System can insert business audit logs" ON public.business_audit_logs;

REVOKE EXECUTE ON FUNCTION public.log_business_audit_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_sokoni_order_business_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_business_id_from_owner() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_business_id_from_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_business_id_from_owner(uuid) TO authenticated;