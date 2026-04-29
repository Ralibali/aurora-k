
-- Role enum and user_roles table for secure role checking
CREATE TYPE public.app_role AS ENUM ('admin', 'driver');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Customers table (full schema)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT,
  invoice_address TEXT,
  visit_address TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  price_per_delivery NUMERIC,
  price_per_hour NUMERIC,
  pricing_type TEXT NOT NULL DEFAULT 'manual' CHECK (pricing_type IN ('per_delivery', 'per_hour', 'manual')),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on customers" ON public.customers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read customer names" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'driver'));

-- Assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  address TEXT NOT NULL,
  instructions TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  assigned_driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  actual_start TIMESTAMPTZ,
  actual_stop TIMESTAMPTZ,
  consignment_photo_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  admin_comment TEXT,
  invoiced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on assignments" ON public.assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignments" ON public.assignments
  FOR SELECT TO authenticated USING (auth.uid() = assigned_driver_id);
CREATE POLICY "Drivers can update own assignments" ON public.assignments
  FOR UPDATE TO authenticated USING (auth.uid() = assigned_driver_id);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number INTEGER UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  assignment_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_ex_vat NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total_inc_vat NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Aurora Medias Transport AB',
  org_number TEXT,
  address TEXT,
  zip_city TEXT,
  email TEXT,
  phone TEXT,
  bankgiro TEXT,
  plusgiro TEXT,
  vat_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on settings" ON public.settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone authenticated can read settings" ON public.settings
  FOR SELECT TO authenticated USING (true);

-- Insert default settings row
INSERT INTO public.settings (company_name) VALUES ('Aurora Medias Transport AB');

-- Storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('consignment-notes', 'consignment-notes', false);

-- Storage policies
CREATE POLICY "Company assets are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Admins can upload company assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update company assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all consignment notes" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'consignment-notes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can upload consignment notes" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'consignment-notes');
CREATE POLICY "Drivers can view own consignment notes" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'consignment-notes');

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(invoice_number), 1000) + 1 FROM public.invoices
$$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
