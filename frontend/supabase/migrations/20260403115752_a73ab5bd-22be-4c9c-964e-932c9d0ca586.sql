
CREATE TABLE public.feature_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on feature_settings"
  ON public.feature_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default features
INSERT INTO public.feature_settings (feature_key, label, description, category, sort_order) VALUES
  ('assignments', 'Uppdrag', 'Hantera uppdrag och arbetsordrar', 'Operativt', 1),
  ('calendar', 'Kalender', 'Kalendervy för schemaläggning', 'Operativt', 2),
  ('orders', 'Beställningar', 'Gruppera uppdrag under beställningar', 'Operativt', 3),
  ('live_map', 'Live-karta', 'Realtidskarta med förarpositioner', 'Operativt', 4),
  ('routes', 'Ruttoptimering', 'Optimera körordning', 'Operativt', 5),
  ('drivers', 'Chaufförer', 'Hantera chaufförer och personal', 'Personal', 10),
  ('vehicles', 'Fordon', 'Fordonsregister', 'Personal', 11),
  ('absences', 'Frånvaro', 'Frånvarohantering', 'Personal', 12),
  ('external_resources', 'Externa resurser', 'Underentreprenörer', 'Personal', 13),
  ('customers', 'Kunder', 'Kundregister', 'Kunder', 20),
  ('booking_requests', 'Förfrågningar', 'Bokningsförfrågningar', 'Kunder', 21),
  ('satisfaction', 'Kundnöjdhet', 'Kundnöjdhetsundersökningar', 'Kunder', 22),
  ('invoices', 'Fakturering', 'Skapa och hantera fakturor', 'Ekonomi', 30),
  ('invoice_templates', 'Fakturamallar', 'Anpassa fakturamallar', 'Ekonomi', 31),
  ('reports', 'Tidrapporter', 'Tidrapporter och exportering', 'Ekonomi', 32),
  ('statistics', 'Statistik', 'Statistik och rapporter', 'Ekonomi', 33),
  ('articles', 'Artiklar', 'Artikelregister med priser', 'Register', 40),
  ('order_templates', 'Mallar', 'Beställningsmallar', 'Register', 41),
  ('driver_settings', 'Förarapp', 'Inställningar för förarappen', 'System', 50),
  ('notifications', 'Notiser', 'Interna notiser', 'System', 51),
  ('approvals', 'Attestering', 'Attestering av uppdrag', 'System', 52),
  ('environment', 'Miljödata', 'Miljö- och utsläppsdata', 'System', 53),
  ('api', 'API', 'API-dokumentation och integrationer', 'System', 54);
