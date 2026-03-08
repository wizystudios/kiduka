
CREATE TABLE public.scheduled_whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'general',
  scheduled_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scheduled messages"
ON public.scheduled_whatsapp_messages FOR INSERT
WITH CHECK (can_access_owner_data(owner_id));

CREATE POLICY "Users can view own scheduled messages"
ON public.scheduled_whatsapp_messages FOR SELECT
USING (can_access_owner_data(owner_id));

CREATE POLICY "Users can update own scheduled messages"
ON public.scheduled_whatsapp_messages FOR UPDATE
USING (can_access_owner_data(owner_id));

CREATE POLICY "Users can delete own scheduled messages"
ON public.scheduled_whatsapp_messages FOR DELETE
USING (can_access_owner_data(owner_id));

CREATE TRIGGER update_scheduled_whatsapp_updated_at
  BEFORE UPDATE ON public.scheduled_whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
