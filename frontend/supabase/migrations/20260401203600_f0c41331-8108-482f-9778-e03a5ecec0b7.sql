
-- Function to check if a driver has assignments in an invoice
CREATE OR REPLACE FUNCTION public.driver_has_invoice_assignments(_user_id uuid, _assignment_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments
    WHERE id = ANY(_assignment_ids)
      AND assigned_driver_id = _user_id
  )
$$;

-- Allow drivers to read invoices containing their assignments
CREATE POLICY "Drivers can read own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.driver_has_invoice_assignments(auth.uid(), assignment_ids)
);
