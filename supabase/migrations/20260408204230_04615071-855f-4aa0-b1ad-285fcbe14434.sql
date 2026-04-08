
CREATE TABLE public.portal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read messages for their own company's customers
CREATE POLICY "Admins can read portal messages"
ON public.portal_messages
FOR SELECT
TO authenticated
USING (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can send messages
CREATE POLICY "Admins can insert portal messages"
ON public.portal_messages
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role) AND sender_type = 'admin');

-- Security definer function for customers to send messages via token
CREATE OR REPLACE FUNCTION public.send_portal_message(p_token TEXT, p_message TEXT, p_sender_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_company_id UUID;
  v_customer_name TEXT;
  v_msg_id UUID;
BEGIN
  IF p_message IS NULL OR trim(p_message) = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  SELECT cat.customer_id, cat.company_id, c.name
  INTO v_customer_id, v_company_id, v_customer_name
  FROM customer_access_tokens cat
  JOIN customers c ON c.id = cat.customer_id
  WHERE cat.token = p_token
    AND (cat.expires_at IS NULL OR cat.expires_at > now());

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  INSERT INTO portal_messages (customer_id, company_id, sender_type, sender_name, message)
  VALUES (v_customer_id, v_company_id, 'customer', COALESCE(p_sender_name, v_customer_name), trim(p_message))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Security definer function for customers to read their messages via token
CREATE OR REPLACE FUNCTION public.get_portal_messages(p_token TEXT)
RETURNS SETOF portal_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT cat.customer_id INTO v_customer_id
  FROM customer_access_tokens cat
  WHERE cat.token = p_token
    AND (cat.expires_at IS NULL OR cat.expires_at > now());

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  RETURN QUERY
  SELECT * FROM portal_messages
  WHERE customer_id = v_customer_id
  ORDER BY created_at ASC;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_messages;

-- Index for fast lookups
CREATE INDEX idx_portal_messages_customer ON public.portal_messages(customer_id, created_at);
CREATE INDEX idx_portal_messages_company ON public.portal_messages(company_id, created_at);
