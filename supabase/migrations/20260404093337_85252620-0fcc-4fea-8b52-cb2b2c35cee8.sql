-- 1. Fix customer_access_tokens: remove open anon SELECT, add SECURITY DEFINER function
DROP POLICY IF EXISTS "Anon can read tokens for validation" ON public.customer_access_tokens;

CREATE OR REPLACE FUNCTION public.validate_customer_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'customer_id', cat.customer_id,
    'company_id', cat.company_id,
    'customer_name', c.name,
    'customer_email', c.email
  ) INTO v_result
  FROM customer_access_tokens cat
  JOIN customers c ON c.id = cat.customer_id
  WHERE cat.token = p_token
    AND (cat.expires_at IS NULL OR cat.expires_at > now());

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_customer_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_customer_token(text) TO authenticated;

-- 2. Fix customer_satisfaction: remove open anon INSERT, add validated RPC
DROP POLICY IF EXISTS "Anon can insert satisfaction" ON public.customer_satisfaction;

CREATE OR REPLACE FUNCTION public.submit_satisfaction(
  p_token text,
  p_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_company_id uuid;
BEGIN
  SELECT cat.customer_id, cat.company_id INTO v_customer_id, v_company_id
  FROM customer_access_tokens cat
  WHERE cat.token = p_token
    AND (cat.expires_at IS NULL OR cat.expires_at > now());

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  INSERT INTO customer_satisfaction (customer_id, company_id, rating, comment)
  VALUES (v_customer_id, v_company_id, p_rating, p_comment);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_satisfaction(text, integer, text) TO anon;

-- 3. Fix feature_settings: add read policy for all authenticated users in same company
CREATE POLICY "Authenticated can read feature_settings"
ON public.feature_settings
FOR SELECT
TO authenticated
USING (company_id = get_my_company_id());