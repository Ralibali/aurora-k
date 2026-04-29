
CREATE TABLE public.driver_settings_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  require_signature boolean,
  require_photo boolean,
  show_time_report boolean,
  show_availability_toggle boolean,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_settings_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on driver_settings_overrides"
  ON public.driver_settings_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read own driver_settings_overrides"
  ON public.driver_settings_overrides FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);
