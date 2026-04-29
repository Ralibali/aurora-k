
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  org_number TEXT,
  fleet_size TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (no auth required)
CREATE POLICY "Anon can create leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  company_name IS NOT NULL AND company_name <> '' AND
  contact_person IS NOT NULL AND contact_person <> '' AND
  email IS NOT NULL AND email <> ''
);

-- Authenticated users can also create leads (from contact page while logged in)
CREATE POLICY "Authenticated can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  company_name IS NOT NULL AND company_name <> '' AND
  contact_person IS NOT NULL AND contact_person <> '' AND
  email IS NOT NULL AND email <> ''
);

-- Platform admins can read all leads
CREATE POLICY "Platform admins can read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Platform admins can update leads
CREATE POLICY "Platform admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Platform admins can delete leads
CREATE POLICY "Platform admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
