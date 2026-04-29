
-- 1. Fix privilege escalation: Drop the overly broad "Admins can manage user roles" policy
--    and replace with separate, tighter policies.
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Admin SELECT: can see roles in their company
CREATE POLICY "Admins can view company user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- Admin INSERT: can only assign roles to users who already belong to their company (profile check)
CREATE POLICY "Admins can insert company user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND company_id = public.get_my_company_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.company_id = public.get_my_company_id()
  )
);

-- Admin UPDATE: same company restriction
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
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.company_id = public.get_my_company_id()
  )
);

-- Admin DELETE: same company
CREATE POLICY "Admins can delete company user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- Users can read their own roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Allow drivers to read their own location records
CREATE POLICY "Drivers can read own location"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (driver_id = auth.uid());
