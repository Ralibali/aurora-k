
-- Create a SECURITY DEFINER function to handle company creation during registration
-- This bypasses RLS since new users don't have a company_id yet
CREATE OR REPLACE FUNCTION public.register_company(
  _name text,
  _org_nr text DEFAULT NULL,
  _user_full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- Get the calling user's ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate company name
  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  -- Check user doesn't already belong to a company
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND company_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  -- Create the company
  INSERT INTO companies (name, org_nr, subscription_status)
  VALUES (trim(_name), _org_nr, 'pending')
  RETURNING id INTO v_company_id;

  -- Update profile with company_id and admin role
  UPDATE profiles
  SET company_id = v_company_id,
      role = 'admin',
      full_name = COALESCE(_user_full_name, full_name)
  WHERE id = v_user_id;

  -- Insert user_role
  INSERT INTO user_roles (user_id, role, company_id)
  VALUES (v_user_id, 'admin', v_company_id)
  ON CONFLICT (user_id, role) DO UPDATE SET company_id = v_company_id;

  RETURN v_company_id;
END;
$$;
