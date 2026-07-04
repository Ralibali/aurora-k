-- Recurring assignment series
CREATE TABLE public.recurring_assignment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  instructions TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','urgent')),
  scheduled_time TIME NOT NULL DEFAULT '08:00',
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  weekdays SMALLINT[] NOT NULL DEFAULT '{}', -- 0=Sun..6=Sat, used for 'weekly'
  day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 31), -- used for 'monthly'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_assignment_series TO authenticated;
GRANT ALL ON public.recurring_assignment_series TO service_role;

ALTER TABLE public.recurring_assignment_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own company series"
  ON public.recurring_assignment_series
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND company_id = public.get_my_company_id())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND company_id = public.get_my_company_id());

CREATE INDEX idx_recurring_series_company_active
  ON public.recurring_assignment_series (company_id, active)
  WHERE active = true;

CREATE TRIGGER trg_recurring_series_updated_at
  BEFORE UPDATE ON public.recurring_assignment_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link assignments back to a series + occurrence date (for idempotent generation)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.recurring_assignment_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_series_date_unique
  ON public.assignments (series_id, series_date)
  WHERE series_id IS NOT NULL;
