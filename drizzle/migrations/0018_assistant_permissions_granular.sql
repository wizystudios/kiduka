ALTER TABLE public.assistant_permissions ADD COLUMN IF NOT EXISTS extra_permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_permissions TO authenticated;
GRANT ALL ON public.assistant_permissions TO service_role;
DROP POLICY IF EXISTS "Super admins manage assistant permissions" ON public.assistant_permissions;
CREATE POLICY "Super admins manage assistant permissions" ON public.assistant_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE UNIQUE INDEX IF NOT EXISTS assistant_permissions_owner_assistant_uidx ON public.assistant_permissions(owner_id, assistant_id);