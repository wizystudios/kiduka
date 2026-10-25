CREATE OR REPLACE FUNCTION public.sync_registered_business_owner_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'owner'::public.business_role AND NEW.is_active
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND b.created_by = NEW.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.user_id)
  THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'owner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_registered_business_owner_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_registered_business_owner_role() TO service_role;
CREATE TRIGGER sync_registered_business_owner_role
AFTER INSERT OR UPDATE OF role, is_active ON public.business_members
FOR EACH ROW EXECUTE FUNCTION public.sync_registered_business_owner_role();