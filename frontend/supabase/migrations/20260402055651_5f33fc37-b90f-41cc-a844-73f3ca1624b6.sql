-- Create compensation type enum
CREATE TYPE public.compensation_type AS ENUM ('hourly', 'per_assignment', 'monthly');

-- Create driver_compensation table
CREATE TABLE public.driver_compensation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL UNIQUE,
  compensation_type compensation_type NOT NULL DEFAULT 'hourly',
  hourly_rate NUMERIC DEFAULT 0,
  per_assignment_rate NUMERIC DEFAULT 0,
  monthly_salary NUMERIC DEFAULT 0,
  tax_table TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_compensation ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access on driver_compensation"
ON public.driver_compensation
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drivers can read own compensation
CREATE POLICY "Drivers can read own compensation"
ON public.driver_compensation
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Trigger for updated_at
CREATE TRIGGER update_driver_compensation_updated_at
BEFORE UPDATE ON public.driver_compensation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();