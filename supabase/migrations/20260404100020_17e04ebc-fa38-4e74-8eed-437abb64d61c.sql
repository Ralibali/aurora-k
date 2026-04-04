-- Drop the overly permissive anon SELECT policy
DROP POLICY IF EXISTS "Anon can read invitations by token" ON public.invitations;

-- Create a secure function to look up invitation by token
CREATE OR REPLACE FUNCTION public.lookup_invitation_by_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', i.id,
    'email', i.email,
    'name', i.name,
    'company_id', i.company_id
  ) INTO v_result
  FROM public.invitations i
  WHERE i.token = p_token
    AND i.accepted_at IS NULL;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  RETURN v_result;
END;
$$;

-- Allow anon to call this function (needed for the join page)
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(uuid) TO authenticated;

-- Also need anon to be able to UPDATE invitations (mark as accepted) via the token
-- We'll create a secure function for that too
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitations
  SET accepted_at = now()
  WHERE token = p_token
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid, uuid) TO authenticated;
