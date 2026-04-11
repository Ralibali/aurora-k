
-- 1. Fix privilege escalation: restrict admins to only assign 'driver' role
DROP POLICY IF EXISTS "Admins can insert company user roles" ON public.user_roles;
CREATE POLICY "Admins can insert company user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND company_id = public.get_my_company_id()
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.company_id = public.get_my_company_id()
  )
);

-- Also restrict UPDATE to prevent changing role to admin
DROP POLICY IF EXISTS "Admins can update company user roles" ON public.user_roles;
CREATE POLICY "Admins can update company user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin')
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.company_id = public.get_my_company_id()
  )
);

-- 2. Fix platform announcements: scope by target
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.platform_announcements;
CREATE POLICY "Users can read relevant active announcements"
ON public.platform_announcements
FOR SELECT
TO authenticated
USING (
  active = true
  AND (
    target = 'all'
    OR (target = 'admins' AND public.has_role(auth.uid(), 'admin'))
    OR (target = 'drivers' AND public.has_role(auth.uid(), 'driver'))
    OR (target = 'platform' AND public.is_platform_admin(auth.uid()))
  )
);

-- 3. Make company-assets bucket private
UPDATE storage.buckets SET public = false WHERE id = 'company-assets';

-- Add SELECT policy for company-assets: authenticated users can read files in their company folder
CREATE POLICY "Company members can read own assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
);

-- Keep existing INSERT/UPDATE policies or add one for uploads
CREATE POLICY "Company admins can upload assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company admins can update assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company admins can delete assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
  AND public.has_role(auth.uid(), 'admin')
);
