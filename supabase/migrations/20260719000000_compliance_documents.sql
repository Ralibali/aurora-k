-- Efterlevnad: förardokument (körkort, ADR, förarbevis) och fordonsunderhåll
-- (besiktning, service, däckbyte) med utgångsdatum för automatiska varningar.

-- Förardokument
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type text NOT NULL,
  label text,
  expires_at date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS driver_documents_company_id_idx ON public.driver_documents (company_id);
CREATE INDEX IF NOT EXISTS driver_documents_driver_id_idx ON public.driver_documents (driver_id);

CREATE POLICY "Admins full access on driver_documents" ON public.driver_documents FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own documents" ON public.driver_documents FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND driver_id = auth.uid());

-- Fordonsunderhåll
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  due_date date,
  due_odometer_km integer,
  done_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vehicle_maintenance_company_id_idx ON public.vehicle_maintenance (company_id);
CREATE INDEX IF NOT EXISTS vehicle_maintenance_vehicle_id_idx ON public.vehicle_maintenance (vehicle_id);

CREATE POLICY "Admins full access on vehicle_maintenance" ON public.vehicle_maintenance FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read vehicle_maintenance" ON public.vehicle_maintenance FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'driver'));
