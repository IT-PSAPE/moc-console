-- Delete a broadcast transactionally and return its authoritative Storage
-- object paths. The client removes those objects after this transaction;
-- broadcast-media policy permits deletion only after item references are gone.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_broadcast_with_items(
  p_broadcast_id uuid,
  p_workspace_id uuid
)
RETURNS TABLE (storage_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.current_user_can(p_workspace_id, 'can_delete') THEN
    RAISE EXCEPTION 'You do not have permission to delete this broadcast' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.broadcasts
  WHERE broadcasts.id = p_broadcast_id
    AND broadcasts.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT broadcast_items.storage_path
  FROM public.broadcast_items
  WHERE broadcast_items.broadcast_id = p_broadcast_id
  ORDER BY broadcast_items.sort_order;

  DELETE FROM public.broadcasts
  WHERE broadcasts.id = p_broadcast_id
    AND broadcasts.workspace_id = p_workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_broadcast_with_items(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_broadcast_with_items(uuid, uuid) TO authenticated;

COMMIT;
