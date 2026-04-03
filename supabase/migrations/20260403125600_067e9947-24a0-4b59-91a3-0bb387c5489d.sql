
-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  org_nr text,
  subscription_status text DEFAULT 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  name text,
  token uuid DEFAULT gen_random_uuid() UNIQUE,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 3. Add company_id to profiles (role column already exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 4. Add company_id to all data tables
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.external_resources ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.driver_absences ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.driver_compensation ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.driver_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.driver_settings_overrides ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.assignment_articles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.assignment_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.assignment_approvals ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.assignment_protocols ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.customer_access_tokens ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.customer_price_lists ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.customer_satisfaction ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.feature_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.invoice_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.order_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 5. Security definer function to get current user's company_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 6. RLS policies for companies
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_my_company_id());

CREATE POLICY "Admins can update own company"
  ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- 7. RLS policies for invitations
CREATE POLICY "Admins can manage invitations for own company"
  ON public.invitations FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon can read invitations by token"
  ON public.invitations FOR SELECT TO anon
  USING (accepted_at IS NULL);

-- 8. Drop existing policies and create company-scoped ones

-- profiles
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Admins can manage company profiles" ON public.profiles FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- assignments
DROP POLICY IF EXISTS "Admins full access on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Drivers can read own assignments" ON public.assignments;
CREATE POLICY "Admins full access on assignments" ON public.assignments FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignments" ON public.assignments FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND auth.uid() = assigned_driver_id);

-- customers
DROP POLICY IF EXISTS "Admins full access on customers" ON public.customers;
DROP POLICY IF EXISTS "Drivers can read assigned customers" ON public.customers;
CREATE POLICY "Admins full access on customers" ON public.customers FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read assigned customers" ON public.customers FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'driver') AND EXISTS (
    SELECT 1 FROM assignments WHERE assignments.customer_id = customers.id AND assignments.assigned_driver_id = auth.uid()
  ));

-- vehicles
DROP POLICY IF EXISTS "Admins full access on vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers can read vehicles" ON public.vehicles;
CREATE POLICY "Admins full access on vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'driver'));

-- orders
DROP POLICY IF EXISTS "Admins full access on orders" ON public.orders;
CREATE POLICY "Admins full access on orders" ON public.orders FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- invoices
DROP POLICY IF EXISTS "Admins full access on invoices" ON public.invoices;
CREATE POLICY "Admins full access on invoices" ON public.invoices FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- articles
DROP POLICY IF EXISTS "Admins full access on articles" ON public.articles;
DROP POLICY IF EXISTS "Drivers can read articles" ON public.articles;
CREATE POLICY "Admins full access on articles" ON public.articles FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read articles" ON public.articles FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'driver'));

-- booking_requests
DROP POLICY IF EXISTS "Admins full access on booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Anon can create booking requests with required fields" ON public.booking_requests;
CREATE POLICY "Admins full access on booking_requests" ON public.booking_requests FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can create booking requests" ON public.booking_requests FOR INSERT TO anon
  WITH CHECK (customer_name IS NOT NULL AND customer_name <> '' AND title IS NOT NULL AND title <> '');

-- external_resources
DROP POLICY IF EXISTS "Admins full access on external_resources" ON public.external_resources;
CREATE POLICY "Admins full access on external_resources" ON public.external_resources FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- notifications
DROP POLICY IF EXISTS "Admins full access on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read targeted notifications" ON public.notifications;
CREATE POLICY "Admins full access on notifications" ON public.notifications FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read targeted notifications" ON public.notifications FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND ((target_role IS NULL) OR (target_user_id = auth.uid()) OR has_role(auth.uid(), target_role::app_role)));

-- driver_absences
DROP POLICY IF EXISTS "Admins full access on driver_absences" ON public.driver_absences;
DROP POLICY IF EXISTS "Drivers can insert own absences" ON public.driver_absences;
DROP POLICY IF EXISTS "Drivers can read own absences" ON public.driver_absences;
CREATE POLICY "Admins full access on driver_absences" ON public.driver_absences FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can insert own absences" ON public.driver_absences FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id() AND driver_id = auth.uid());
CREATE POLICY "Drivers can read own absences" ON public.driver_absences FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND driver_id = auth.uid());

-- driver_compensation
DROP POLICY IF EXISTS "Admins full access on driver_compensation" ON public.driver_compensation;
DROP POLICY IF EXISTS "Drivers can read own compensation" ON public.driver_compensation;
CREATE POLICY "Admins full access on driver_compensation" ON public.driver_compensation FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own compensation" ON public.driver_compensation FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND auth.uid() = driver_id);

-- driver_locations
DROP POLICY IF EXISTS "Admins can read all driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can delete own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can upsert own location" ON public.driver_locations;
CREATE POLICY "Admins can read all driver locations" ON public.driver_locations FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can upsert own location" ON public.driver_locations FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id() AND auth.uid() = driver_id);
CREATE POLICY "Drivers can update own location" ON public.driver_locations FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can delete own location" ON public.driver_locations FOR DELETE TO authenticated
  USING (auth.uid() = driver_id);

-- driver_settings
DROP POLICY IF EXISTS "Admins full access on driver_settings" ON public.driver_settings;
DROP POLICY IF EXISTS "Authenticated can read driver_settings" ON public.driver_settings;
CREATE POLICY "Admins full access on driver_settings" ON public.driver_settings FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read driver_settings" ON public.driver_settings FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- driver_settings_overrides
DROP POLICY IF EXISTS "Admins full access on driver_settings_overrides" ON public.driver_settings_overrides;
DROP POLICY IF EXISTS "Authenticated can read own driver_settings_overrides" ON public.driver_settings_overrides;
CREATE POLICY "Admins full access on driver_settings_overrides" ON public.driver_settings_overrides FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read own driver_settings_overrides" ON public.driver_settings_overrides FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND auth.uid() = driver_id);

-- assignment_articles
DROP POLICY IF EXISTS "Admins full access on assignment_articles" ON public.assignment_articles;
DROP POLICY IF EXISTS "Drivers can read own assignment articles" ON public.assignment_articles;
CREATE POLICY "Admins full access on assignment_articles" ON public.assignment_articles FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignment articles" ON public.assignment_articles FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND EXISTS (
    SELECT 1 FROM assignments WHERE assignments.id = assignment_articles.assignment_id AND assignments.assigned_driver_id = auth.uid()
  ));

-- assignment_logs
DROP POLICY IF EXISTS "Admins full access on assignment_logs" ON public.assignment_logs;
DROP POLICY IF EXISTS "Drivers can read own assignment logs" ON public.assignment_logs;
CREATE POLICY "Admins full access on assignment_logs" ON public.assignment_logs FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignment logs" ON public.assignment_logs FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND EXISTS (
    SELECT 1 FROM assignments WHERE assignments.id = assignment_logs.assignment_id AND assignments.assigned_driver_id = auth.uid()
  ));

-- assignment_approvals
DROP POLICY IF EXISTS "Admins full access on assignment_approvals" ON public.assignment_approvals;
CREATE POLICY "Admins full access on assignment_approvals" ON public.assignment_approvals FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- assignment_protocols
DROP POLICY IF EXISTS "Admins full access on assignment_protocols" ON public.assignment_protocols;
DROP POLICY IF EXISTS "Drivers can create own assignment protocols" ON public.assignment_protocols;
DROP POLICY IF EXISTS "Drivers can read own assignment protocols" ON public.assignment_protocols;
CREATE POLICY "Admins full access on assignment_protocols" ON public.assignment_protocols FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can create own assignment protocols" ON public.assignment_protocols FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id() AND created_by = auth.uid());
CREATE POLICY "Drivers can read own assignment protocols" ON public.assignment_protocols FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() AND EXISTS (
    SELECT 1 FROM assignments WHERE assignments.id = assignment_protocols.assignment_id AND assignments.assigned_driver_id = auth.uid()
  ));

-- customer_access_tokens
DROP POLICY IF EXISTS "Admins full access on customer_access_tokens" ON public.customer_access_tokens;
DROP POLICY IF EXISTS "Anon can read tokens for validation" ON public.customer_access_tokens;
CREATE POLICY "Admins full access on customer_access_tokens" ON public.customer_access_tokens FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can read tokens for validation" ON public.customer_access_tokens FOR SELECT TO anon
  USING (true);

-- customer_price_lists
DROP POLICY IF EXISTS "Admins full access on customer_price_lists" ON public.customer_price_lists;
CREATE POLICY "Admins full access on customer_price_lists" ON public.customer_price_lists FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- customer_satisfaction
DROP POLICY IF EXISTS "Admins full access on customer_satisfaction" ON public.customer_satisfaction;
DROP POLICY IF EXISTS "Anon can insert satisfaction with required fields" ON public.customer_satisfaction;
CREATE POLICY "Admins full access on customer_satisfaction" ON public.customer_satisfaction FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert satisfaction" ON public.customer_satisfaction FOR INSERT TO anon
  WITH CHECK (customer_id IS NOT NULL AND rating >= 1 AND rating <= 5);

-- feature_settings
DROP POLICY IF EXISTS "Admins full access on feature_settings" ON public.feature_settings;
CREATE POLICY "Admins full access on feature_settings" ON public.feature_settings FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- invoice_templates
DROP POLICY IF EXISTS "Admins full access on invoice_templates" ON public.invoice_templates;
CREATE POLICY "Admins full access on invoice_templates" ON public.invoice_templates FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- order_templates
DROP POLICY IF EXISTS "Admins full access on order_templates" ON public.order_templates;
CREATE POLICY "Admins full access on order_templates" ON public.order_templates FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));

-- settings
DROP POLICY IF EXISTS "Admins full access on settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.settings;
CREATE POLICY "Admins full access on settings" ON public.settings FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read company settings" ON public.settings FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

-- user_roles (keep existing, add company_id)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Companies can be inserted by anyone authenticated (for onboarding)
CREATE POLICY "Authenticated can create companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);
