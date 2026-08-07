CREATE POLICY "Platform admins can create companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()) AND name IS NOT NULL AND name <> '');

CREATE POLICY "Platform admins can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage settings"
ON public.settings FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));