-- Create driver_locations table for real-time GPS tracking
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on driver_id so we only keep latest position per driver
CREATE UNIQUE INDEX idx_driver_locations_driver_id ON public.driver_locations (driver_id);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Admins can read all driver locations
CREATE POLICY "Admins can read all driver locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drivers can upsert their own location
CREATE POLICY "Drivers can upsert own location"
ON public.driver_locations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own location"
ON public.driver_locations
FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

-- Drivers can delete their own location (when stopping tracking)
CREATE POLICY "Drivers can delete own location"
ON public.driver_locations
FOR DELETE
TO authenticated
USING (auth.uid() = driver_id);

-- Enable realtime for live map updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;