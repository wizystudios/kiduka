
-- REVOKE from PUBLIC (default grant) then re-grant to specific roles where needed
REVOKE EXECUTE ON FUNCTION public.add_assistant_permission_by_email(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_assistant_permission_by_email(text, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_assistant_permission(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_assistant_permission(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_user_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_subscription(uuid) TO authenticated;

-- Helpers used by RLS only — no need to be callable directly. RLS policies execute regardless of EXECUTE grants because they evaluate as the policy owner context for SECURITY DEFINER funcs invoked via has_role pattern.
-- But Postgres requires EXECUTE permission to invoke functions in policies; keep grants for authenticated where RLS needs them, revoke from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_owner_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_owner_data(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_branch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid) TO authenticated;

-- track_sokoni_order: public phone-based tracking endpoint (intentionally callable by anon)
-- Keep both grants. We will document this exception.
