-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated can create companies" ON public.companies;

-- Create a stricter INSERT policy
CREATE POLICY "Authenticated can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  name IS NOT NULL AND name <> ''
);