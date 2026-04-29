
-- 1. Make signatures bucket private
UPDATE storage.buckets SET public = false WHERE id = 'signatures';

-- 2. Drop overly broad policies
DROP POLICY IF EXISTS "Drivers can view own consignment notes" ON storage.objects;
DROP POLICY IF EXISTS "Public can read signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can upload consignment notes" ON storage.objects;

-- 3. Create scoped consignment-notes policies (path: {driver_uid}/...)
CREATE POLICY "Drivers can view own consignment notes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consignment-notes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all consignment notes v2"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consignment-notes'
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can view all consignment notes" ON storage.objects;

CREATE POLICY "Drivers can upload own consignment notes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'consignment-notes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Create scoped signatures policies (path: {driver_uid}/...)
CREATE POLICY "Drivers can upload own signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Drivers can read own signatures"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Drivers can update own signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
