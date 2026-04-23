DROP POLICY IF EXISTS "Users view own nurath logs or admin views all" ON public.nurath_logs;

CREATE POLICY "Super admin can view all nurath logs"
ON public.nurath_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));