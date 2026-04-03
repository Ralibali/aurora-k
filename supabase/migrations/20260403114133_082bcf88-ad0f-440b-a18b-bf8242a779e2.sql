
CREATE TABLE public.customer_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on customer_access_tokens" ON public.customer_access_tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Allow anonymous read for portal access validation
CREATE POLICY "Anon can read tokens for validation" ON public.customer_access_tokens FOR SELECT TO anon USING (true);
