
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anon can insert satisfaction" ON public.customer_satisfaction;
DROP POLICY IF EXISTS "Anon can create booking requests" ON public.booking_requests;

-- Replace with slightly more restrictive policies
CREATE POLICY "Anon can insert satisfaction with required fields" ON public.customer_satisfaction FOR INSERT TO anon WITH CHECK (
  customer_id IS NOT NULL AND rating >= 1 AND rating <= 5
);
CREATE POLICY "Anon can create booking requests with required fields" ON public.booking_requests FOR INSERT TO anon WITH CHECK (
  customer_name IS NOT NULL AND customer_name != '' AND title IS NOT NULL AND title != ''
);
