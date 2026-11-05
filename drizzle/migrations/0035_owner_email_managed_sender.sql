CREATE TABLE IF NOT EXISTS public.owner_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  template_name text NOT NULL,
  idempotency_key text,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT ALL ON public.owner_email_notifications TO service_role;
ALTER TABLE public.owner_email_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.notify_owner_email(_owner_id uuid, _template text, _idempotency text, _data jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _id uuid;
BEGIN
  IF _owner_id IS NULL OR _template NOT LIKE 'owner-%' THEN RETURN; END IF;
  INSERT INTO public.owner_email_notifications(owner_id, template_name, idempotency_key, template_data)
  VALUES (_owner_id, _template, _idempotency, COALESCE(_data, '{}'::jsonb))
  RETURNING id INTO _id;
  PERFORM net.http_post(
    url := 'https://qbjcuenvjrflfbdshogq.supabase.co/functions/v1/notify-owner-email',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notificationId', _id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_owner_email failed: %', SQLERRM;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_owner_email(uuid, text, text, jsonb) FROM public, anon, authenticated;