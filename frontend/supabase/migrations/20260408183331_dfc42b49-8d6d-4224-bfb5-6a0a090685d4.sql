
-- 1. Fix consignment-notes admin SELECT policy to scope by company
DROP POLICY IF EXISTS "Admins can view all consignment notes v2" ON storage.objects;

CREATE POLICY "Admins can view own company consignment notes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consignment-notes'
  AND has_role(auth.uid(), 'admin')
  AND (
    SELECT company_id FROM public.profiles
    WHERE id = (storage.foldername(name))[1]::uuid
  ) = get_my_company_id()
);

-- 2. Fix signatures admin SELECT policy to also scope by company
DROP POLICY IF EXISTS "Drivers can read own signatures" ON storage.objects;

CREATE POLICY "Users can read own or company signatures"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR (
      has_role(auth.uid(), 'admin')
      AND (
        SELECT company_id FROM public.profiles
        WHERE id = (storage.foldername(name))[1]::uuid
      ) = get_my_company_id()
    )
  )
);

-- 3. Restrict companies INSERT to users who don't already have a company
DROP POLICY IF EXISTS "Authenticated can create companies" ON public.companies;

CREATE POLICY "Users without company can create companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  name IS NOT NULL
  AND name <> ''
  AND get_my_company_id() IS NULL
);

-- 4. Restrict settings SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read company settings" ON public.settings;

CREATE POLICY "Admins can read company settings"
ON public.settings FOR SELECT TO authenticated
USING (
  company_id = get_my_company_id()
  AND has_role(auth.uid(), 'admin')
);
