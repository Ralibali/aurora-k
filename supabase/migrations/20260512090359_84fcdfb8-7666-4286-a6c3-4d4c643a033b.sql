-- 1. user_roles: restrict UPDATE to only target existing driver rows
DROP POLICY IF EXISTS "Admins can update company user roles" ON public.user_roles;
CREATE POLICY "Admins can update company user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  company_id = get_my_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
  AND role = 'driver'::app_role
)
WITH CHECK (
  company_id = get_my_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
  AND role = 'driver'::app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = get_my_company_id()
  )
);

-- 2. profiles: prevent admins from re-homing a user to another company
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
CREATE POLICY "Admins can read company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert company profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 3. invitations: explicit admin-only SELECT (defense in depth)
DROP POLICY IF EXISTS "Admins can manage invitations for own company" ON public.invitations;
CREATE POLICY "Admins can read invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 4. storage: remove broadly-permissive public SELECT on company-assets
DROP POLICY IF EXISTS "Company assets are publicly accessible" ON storage.objects;
