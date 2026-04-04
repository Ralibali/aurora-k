
-- 1. Platform admins table
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check platform admin status
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  )
$$;

-- 3. RLS for platform_admins table
CREATE POLICY "Platform admins can read"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 4. Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage own tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins full access on support_tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 5. Platform announcements table
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
  ON public.platform_announcements FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Platform admins full access on announcements"
  ON public.platform_announcements FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 6. Allow platform admins to read all companies (cross-tenant)
CREATE POLICY "Platform admins can read all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 7. Allow platform admins to read all profiles (cross-tenant)
CREATE POLICY "Platform admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 8. Timestamp triggers
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_announcements_updated_at
  BEFORE UPDATE ON public.platform_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
