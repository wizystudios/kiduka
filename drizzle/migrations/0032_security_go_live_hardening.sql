ALTER TABLE public.business_ads ADD COLUMN IF NOT EXISTS approved_at timestamptz;
UPDATE public.business_ads SET approved_at = created_at WHERE approved_at IS NULL;

CREATE OR REPLACE FUNCTION public.guard_business_ad_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.approved_at := NULL;
  ELSE
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.image_url IS DISTINCT FROM OLD.image_url OR NEW.link_url IS DISTINCT FROM OLD.link_url
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.display_location IS DISTINCT FROM OLD.display_location OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      NEW.approved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_business_ad_approval ON public.business_ads;
CREATE TRIGGER guard_business_ad_approval BEFORE INSERT OR UPDATE ON public.business_ads
FOR EACH ROW EXECUTE FUNCTION public.guard_business_ad_approval();

DROP POLICY IF EXISTS "Anyone can view active ads" ON public.business_ads;
CREATE POLICY "Anyone can view active ads" ON public.business_ads FOR SELECT
USING (is_active = true AND approved_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.check_user_subscription_guard(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL AND session_user NOT IN ('anon','authenticated'))
      OR auth.uid() = p_user_id
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.can_access_owner_data(p_user_id)
$$;

DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.check_user_subscription(uuid)'::regprocedure) INTO d;
  IF position('check_user_subscription_guard' in d) = 0 THEN
    d := replace(d, E'BEGIN\n  SELECT * INTO v_profile', E'BEGIN\n  IF NOT public.check_user_subscription_guard(p_user_id) THEN\n    RAISE EXCEPTION ''Not allowed'' USING ERRCODE = ''42501'';\n  END IF;\n  SELECT * INTO v_profile');
    IF position('check_user_subscription_guard' in d) = 0 THEN
      RAISE EXCEPTION 'could not patch check_user_subscription';
    END IF;
    EXECUTE d;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.check_user_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_subscription(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_delete_attempt(p_business_id uuid, p_actor_id uuid, p_entity_type text, p_entity_id text, p_action text, p_summary text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_actor uuid := COALESCE(auth.uid(), p_actor_id);
BEGIN
  IF auth.uid() IS NOT NULL AND p_business_id IS NOT NULL
     AND NOT (public.can_access_business_data(p_business_id) OR public.has_role(auth.uid(), 'super_admin')) THEN
    RETURN;
  END IF;
  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (p_business_id, v_actor, left(p_entity_type, 64), left(p_entity_id, 128), left(p_action, 64), left(p_summary, 1000),
          COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('timestamp', now()));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_delete_attempt failed: %', SQLERRM;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_delete_attempt(uuid,uuid,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_delete_attempt(uuid,uuid,text,text,text,text,jsonb) TO authenticated, service_role;

-- Reuse the authenticated compliance job request for the subscription reminder.
DO $$
DECLARE v_cmd text; v_sched text; v_id bigint;
BEGIN
  SELECT command, schedule INTO v_cmd, v_sched FROM cron.job WHERE jobname = 'compliance-reminder-daily';
  SELECT jobid INTO v_id FROM cron.job WHERE jobname = 'subscription-reminder-daily';
  IF v_cmd IS NOT NULL AND v_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_id, command := replace(v_cmd, '/functions/v1/compliance-reminder', '/functions/v1/subscription-reminder'));
  END IF;
END $$;