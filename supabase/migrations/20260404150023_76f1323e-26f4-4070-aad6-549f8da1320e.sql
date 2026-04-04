
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_name text;
  v_email text;
BEGIN
  -- Get invitation details and mark as accepted
  SELECT company_id, name, email INTO v_company_id, v_name, v_email
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET accepted_at = now()
  WHERE token = p_token;

  -- Update profile with company_id
  UPDATE public.profiles
  SET company_id = v_company_id,
      role = 'driver',
      full_name = COALESCE(v_name, full_name)
  WHERE id = p_user_id;

  -- Ensure user_role exists
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (p_user_id, 'driver', v_company_id)
  ON CONFLICT (user_id, role) DO UPDATE SET company_id = v_company_id;
END;
$function$;
