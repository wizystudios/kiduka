
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.whatsapp_messages
  FOR SELECT USING (can_access_owner_data(owner_id));

CREATE POLICY "Users can insert own messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (can_access_owner_data(owner_id));
