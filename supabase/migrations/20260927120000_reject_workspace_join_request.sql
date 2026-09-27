-- Let workspace managers decline a pending access request. The request row is
-- removed without creating a membership, so the account stays locked out.

BEGIN;

CREATE OR REPLACE FUNCTION public.reject_workspace_join_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.workspace_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.workspace_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending access request not found';
  END IF;

  IF NOT private.current_user_can(v_request.workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.workspace_join_requests WHERE id = p_request_id;
  RETURN v_request.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_workspace_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_workspace_join_request(uuid) TO authenticated;

COMMIT;
