
CREATE TABLE public.recurring_generation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','admin','service')),
  triggered_by_user UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  generated INTEGER NOT NULL DEFAULT 0,
  considered INTEGER NOT NULL DEFAULT 0,
  series_count INTEGER NOT NULL DEFAULT 0,
  horizon_days INTEGER,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_runs_company ON public.recurring_generation_runs(company_id, started_at DESC);
CREATE INDEX idx_recurring_runs_started ON public.recurring_generation_runs(started_at DESC);

GRANT SELECT ON public.recurring_generation_runs TO authenticated;
GRANT ALL ON public.recurring_generation_runs TO service_role;

ALTER TABLE public.recurring_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see their company runs"
ON public.recurring_generation_runs
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
