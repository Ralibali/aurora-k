
-- Remove driver invoice access
DROP POLICY IF EXISTS "Drivers can read own invoices" ON public.invoices;

-- Drop the helper function too
DROP FUNCTION IF EXISTS public.driver_has_invoice_assignments(uuid, uuid[]);

-- Create assignment history/audit log
CREATE TABLE public.assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on assignment_logs"
ON public.assignment_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can read own assignment logs"
ON public.assignment_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments
    WHERE assignments.id = assignment_logs.assignment_id
      AND assignments.assigned_driver_id = auth.uid()
  )
);

CREATE INDEX idx_assignment_logs_assignment_id ON public.assignment_logs(assignment_id);
