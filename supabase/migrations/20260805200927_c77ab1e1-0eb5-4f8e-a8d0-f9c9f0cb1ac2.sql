DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages;

CREATE POLICY "Scoped realtime receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user:' || auth.uid()::text
  OR (
    realtime.topic() LIKE 'business:%'
    AND EXISTS (
      SELECT 1 FROM public.get_user_business_ids(auth.uid()) b(bid)
      WHERE 'business:' || b.bid::text = realtime.topic()
    )
  )
);

CREATE POLICY "Scoped realtime send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'user:' || auth.uid()::text
  OR (
    realtime.topic() LIKE 'business:%'
    AND EXISTS (
      SELECT 1 FROM public.get_user_business_ids(auth.uid()) b(bid)
      WHERE 'business:' || b.bid::text = realtime.topic()
    )
  )
);