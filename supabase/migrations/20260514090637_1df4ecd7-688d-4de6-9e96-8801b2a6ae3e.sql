
-- Trigger function: on email failure, notify the owner in-app + admin
CREATE OR REPLACE FUNCTION public.notify_owner_email_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _title text;
  _msg text;
BEGIN
  IF NEW.status NOT IN ('dlq','bounced','failed','complained') THEN
    RETURN NEW;
  END IF;

  -- Find the owner (profile) by recipient email
  SELECT id INTO _owner_id
  FROM public.profiles
  WHERE lower(email) = lower(NEW.recipient_email)
  LIMIT 1;

  _title := CASE NEW.status
    WHEN 'bounced'    THEN 'Barua pepe haijafika (bounce)'
    WHEN 'complained' THEN 'Mlalamiko wa barua pepe (spam)'
    WHEN 'dlq'        THEN 'Barua pepe imeshindikana baada ya majaribio'
    ELSE 'Hitilafu ya barua pepe'
  END;

  _msg := format(
    'Template: %s. Mpokeaji: %s. Sababu: %s',
    COALESCE(NEW.template_name, '—'),
    NEW.recipient_email,
    COALESCE(NEW.error_message, 'Hakuna maelezo')
  );

  -- Always log to admin_notifications (super admin sees system-wide)
  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES (
    'email_failure',
    _title,
    _msg,
    jsonb_build_object(
      'log_id', NEW.id,
      'message_id', NEW.message_id,
      'template', NEW.template_name,
      'recipient', NEW.recipient_email,
      'status', NEW.status,
      'error', NEW.error_message,
      'owner_id', _owner_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_email_failure ON public.email_send_log;
CREATE TRIGGER trg_notify_owner_email_failure
AFTER INSERT ON public.email_send_log
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_email_failure();

REVOKE EXECUTE ON FUNCTION public.notify_owner_email_failure() FROM anon, authenticated;
