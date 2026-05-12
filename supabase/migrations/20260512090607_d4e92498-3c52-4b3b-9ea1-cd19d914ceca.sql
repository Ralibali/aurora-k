-- 1. notifications: require an explicit target (no NULL fallback to "everyone")
DROP POLICY IF EXISTS "Users can read targeted notifications" ON public.notifications;
CREATE POLICY "Users can read targeted notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  company_id = get_my_company_id()
  AND (
    target_user_id = auth.uid()
    OR (target_role IS NOT NULL AND has_role(auth.uid(), target_role::app_role))
  )
);

-- 2. user_roles: drop duplicate SELECT policy
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

-- 3. storage: drop the loose company-assets admin policies; folder-scoped variants remain
DROP POLICY IF EXISTS "Admins can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company assets" ON storage.objects;
