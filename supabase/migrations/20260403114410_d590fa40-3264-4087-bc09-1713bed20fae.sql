
-- Driver absences (frånvarohantering)
CREATE TABLE public.driver_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on driver_absences" ON public.driver_absences FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own absences" ON public.driver_absences FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "Drivers can insert own absences" ON public.driver_absences FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());

-- Assignment protocols (protokoll)
CREATE TABLE public.assignment_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  protocol_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT,
  signature_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignment_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on assignment_protocols" ON public.assignment_protocols FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignment protocols" ON public.assignment_protocols FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assignments WHERE assignments.id = assignment_protocols.assignment_id AND assignments.assigned_driver_id = auth.uid())
);
CREATE POLICY "Drivers can create own assignment protocols" ON public.assignment_protocols FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Customer satisfaction (kundnöjdhet)
CREATE TABLE public.customer_satisfaction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_satisfaction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on customer_satisfaction" ON public.customer_satisfaction FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert satisfaction" ON public.customer_satisfaction FOR INSERT TO anon WITH CHECK (true);

-- Assignment approvals (attestering)
CREATE TABLE public.assignment_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignment_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on assignment_approvals" ON public.assignment_approvals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Invoice templates (anpassa mallar)
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  header_html TEXT,
  footer_html TEXT,
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_bank_details BOOLEAN NOT NULL DEFAULT true,
  primary_color TEXT NOT NULL DEFAULT '#1a1a2e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on invoice_templates" ON public.invoice_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Booking requests (bokningsförfrågningar)
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  title TEXT NOT NULL,
  description TEXT,
  preferred_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on booking_requests" ON public.booking_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can create booking requests" ON public.booking_requests FOR INSERT TO anon WITH CHECK (true);

-- External resources (externa resurser/underleverantörer)
CREATE TABLE public.external_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  hourly_rate NUMERIC,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.external_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on external_resources" ON public.external_resources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications (utropsmeddelanden)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_role TEXT,
  target_user_id UUID,
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read targeted notifications" ON public.notifications FOR SELECT TO authenticated USING (
  target_role IS NULL OR
  target_user_id = auth.uid() OR
  public.has_role(auth.uid(), target_role::public.app_role)
);

-- Add currency field to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SEK';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT 'kr';

-- Add environmental data fields to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS co2_kg NUMERIC;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC;

-- Triggers
CREATE TRIGGER update_driver_absences_updated_at BEFORE UPDATE ON public.driver_absences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON public.invoice_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_external_resources_updated_at BEFORE UPDATE ON public.external_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
