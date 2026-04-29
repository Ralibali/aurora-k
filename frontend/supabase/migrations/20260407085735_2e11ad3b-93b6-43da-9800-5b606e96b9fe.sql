
-- 1. Add show_total_hours to driver_settings
ALTER TABLE public.driver_settings 
ADD COLUMN show_total_hours boolean NOT NULL DEFAULT true;

-- 2. Add show_total_hours to driver_settings_overrides
ALTER TABLE public.driver_settings_overrides 
ADD COLUMN show_total_hours boolean DEFAULT NULL;

-- 3. Add invoice_mode to settings
ALTER TABLE public.settings 
ADD COLUMN invoice_mode text NOT NULL DEFAULT 'invoice';

-- 4. Create OB rates table
CREATE TABLE public.ob_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'weekday_evening',
  rate_per_hour numeric NOT NULL DEFAULT 0,
  start_time time NOT NULL DEFAULT '18:00',
  end_time time NOT NULL DEFAULT '06:00',
  applies_to_weekdays boolean NOT NULL DEFAULT true,
  applies_to_saturdays boolean NOT NULL DEFAULT false,
  applies_to_sundays boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ob_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on ob_rates"
ON public.ob_rates FOR ALL TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can read ob_rates"
ON public.ob_rates FOR SELECT TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'driver'));

-- 5. Create per diem rates table
CREATE TABLE public.per_diem_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'full_day',
  amount numeric NOT NULL DEFAULT 0,
  min_hours numeric NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.per_diem_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on per_diem_rates"
ON public.per_diem_rates FOR ALL TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can read per_diem_rates"
ON public.per_diem_rates FOR SELECT TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'driver'));
