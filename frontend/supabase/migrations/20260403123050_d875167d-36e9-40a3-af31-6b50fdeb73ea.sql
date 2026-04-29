
-- Add foreign key on customer_satisfaction.assignment_id only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_satisfaction_assignment_id_fkey'
      AND table_name = 'customer_satisfaction'
  ) THEN
    ALTER TABLE public.customer_satisfaction
      ADD CONSTRAINT customer_satisfaction_assignment_id_fkey
      FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE SET NULL;
  END IF;
END $$;
