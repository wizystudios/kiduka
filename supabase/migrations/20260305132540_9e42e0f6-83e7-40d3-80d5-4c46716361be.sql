
-- Chat messages table for real-time customer-admin support
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_name text,
  sender_type text NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  recipient_id uuid,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can see their own messages or messages sent to them
CREATE POLICY "Users can view their chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR has_role(auth.uid(), 'super_admin'));

-- Users can insert their own messages
CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Admin can update messages (mark as read)
CREATE POLICY "Admin can update messages"
  ON public.chat_messages FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin') OR auth.uid() = recipient_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add delivery person details to sokoni_orders
ALTER TABLE public.sokoni_orders 
  ADD COLUMN IF NOT EXISTS delivery_person_name text,
  ADD COLUMN IF NOT EXISTS delivery_person_phone text;
