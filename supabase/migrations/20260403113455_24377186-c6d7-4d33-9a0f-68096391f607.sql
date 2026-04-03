
-- Articles registry
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'st',
  default_price NUMERIC NOT NULL DEFAULT 0,
  article_number TEXT,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on articles" ON public.articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read articles" ON public.articles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'driver'));

-- Assignment articles (line items on assignments)
CREATE TABLE public.assignment_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'st',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignment_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on assignment_articles" ON public.assignment_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read own assignment articles" ON public.assignment_articles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assignments WHERE assignments.id = assignment_articles.assignment_id AND assignments.assigned_driver_id = auth.uid())
);

-- Vehicles / objects
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vehicle',
  make TEXT,
  model TEXT,
  year INTEGER,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'driver'));

-- Add vehicle_id to assignments
ALTER TABLE public.assignments ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Orders (groups of assignments)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add order_id to assignments
ALTER TABLE public.assignments ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Customer price lists
CREATE TABLE public.customer_price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, article_id)
);
ALTER TABLE public.customer_price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on customer_price_lists" ON public.customer_price_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order templates
CREATE TABLE public.order_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on order_templates" ON public.order_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Geofence zones
ALTER TABLE public.assignments ADD COLUMN geofence_radius INTEGER DEFAULT NULL;
ALTER TABLE public.assignments ADD COLUMN geofence_lat DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE public.assignments ADD COLUMN geofence_lng DOUBLE PRECISION DEFAULT NULL;

-- Add updated_at triggers
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_order_templates_updated_at BEFORE UPDATE ON public.order_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
