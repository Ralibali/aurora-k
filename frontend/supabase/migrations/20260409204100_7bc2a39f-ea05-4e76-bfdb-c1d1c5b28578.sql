
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  company_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_company ON public.audit_logs (company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins in same company can read audit logs
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  company_id = get_my_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- No one can manually insert/update/delete - only triggers
-- But we need the trigger function to insert, so use SECURITY DEFINER

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := OLD.id;
    v_company_id := OLD.company_id;
  END IF;

  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, company_id)
  VALUES (TG_TABLE_NAME, v_record_id, v_action, v_old, v_new, auth.uid(), v_company_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to assignments
CREATE TRIGGER audit_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Attach triggers to invoices
CREATE TRIGGER audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Attach triggers to customers
CREATE TRIGGER audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
