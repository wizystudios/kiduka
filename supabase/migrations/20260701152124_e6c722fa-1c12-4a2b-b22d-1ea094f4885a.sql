
-- Fix 1: can_access_owner_data must exclude deactivated assistants
CREATE OR REPLACE FUNCTION public.can_access_owner_data(target_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = target_owner_id OR
    EXISTS (
      SELECT 1 FROM assistant_permissions 
      WHERE assistant_id = auth.uid() 
      AND owner_id = target_owner_id
      AND COALESCE(is_active, true) = true
    );
$$;

-- Fix 2: Lock down realtime.messages so only authenticated users may
-- subscribe/broadcast, and postgres_changes still enforces underlying table RLS.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages;
CREATE POLICY "Authenticated can send realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
