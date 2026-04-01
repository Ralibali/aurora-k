
-- 1. Drop broad driver UPDATE policy on assignments
DROP POLICY IF EXISTS "Drivers can update own assignments" ON public.assignments;

-- 2. Create secure RPC for driver assignment updates (only permitted fields)
CREATE OR REPLACE FUNCTION public.driver_update_assignment(
  _id uuid,
  _status text DEFAULT NULL,
  _actual_start timestamptz DEFAULT NULL,
  _actual_stop timestamptz DEFAULT NULL,
  _driver_comment text DEFAULT NULL,
  _consignment_photo_url text DEFAULT NULL,
  _signature_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assignments SET
    status = COALESCE(_status, status),
    actual_start = COALESCE(_actual_start, actual_start),
    actual_stop = COALESCE(_actual_stop, actual_stop),
    driver_comment = COALESCE(_driver_comment, driver_comment),
    consignment_photo_url = COALESCE(_consignment_photo_url, consignment_photo_url),
    signature_url = COALESCE(_signature_url, signature_url)
  WHERE id = _id AND assigned_driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found or not assigned to you';
  END IF;
END;
$$;

-- 3. Replace broad driver customer read with scoped policy
DROP POLICY IF EXISTS "Drivers can read customer names" ON public.customers;

CREATE POLICY "Drivers can read assigned customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.customer_id = customers.id
    AND assignments.assigned_driver_id = auth.uid()
  )
);

-- 4. Add DELETE/UPDATE policies on consignment-notes storage bucket
CREATE POLICY "Drivers can update own consignment notes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'consignment-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drivers can delete own consignment notes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'consignment-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
