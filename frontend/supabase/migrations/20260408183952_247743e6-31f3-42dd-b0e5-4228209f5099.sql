
-- Add DELETE policy for drivers to delete their own signatures
CREATE POLICY "Drivers can delete own signatures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Add DELETE policy for admins to delete company signatures
CREATE POLICY "Admins can delete company signatures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'signatures'
  AND has_role(auth.uid(), 'admin')
  AND (
    SELECT company_id FROM public.profiles
    WHERE id = (storage.foldername(name))[1]::uuid
  ) = get_my_company_id()
);
