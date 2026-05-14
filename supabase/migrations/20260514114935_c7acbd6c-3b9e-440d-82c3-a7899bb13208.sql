
-- 1. Drop public bucket-wide SELECT policies (public buckets still serve via direct URL CDN)
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read email assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read qa screenshots" ON storage.objects;

-- Replace with scoped policies: only the owning user (folder = uid) can list their own objects.
CREATE POLICY "Users list own product images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Super admins list email assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Owners list own qa screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'qa-screenshots'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 2. Tighten EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.add_assistant_permission_by_email(text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_subscription(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_owner_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_branch(uuid) FROM anon;
