
CREATE POLICY "Super admins manage email assets - insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Super admins manage email assets - update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Super admins manage email assets - delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
);
