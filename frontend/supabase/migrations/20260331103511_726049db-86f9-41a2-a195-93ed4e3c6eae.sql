
CREATE TABLE public.driver_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  require_signature boolean NOT NULL DEFAULT true,
  require_photo boolean NOT NULL DEFAULT true,
  show_time_report boolean NOT NULL DEFAULT true,
  show_availability_toggle boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on driver_settings"
  ON public.driver_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read driver_settings"
  ON public.driver_settings FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.driver_settings (require_signature, require_photo, show_time_report, show_availability_toggle)
VALUES (true, true, true, true);
