-- Zoom Marketplace deauthorization handling.
--
-- A user removing the Marketplace app must remove all Zoom-derived data from
-- every MOC workspace linked to that Zoom user. The API invokes this function
-- only after validating Zoom's signed app_deauthorized webhook.

BEGIN;

-- Zoom's `start_url` is a host credential, not meeting metadata that a
-- workspace member may retrieve through PostgREST. Removing the column also
-- permanently removes any values that were previously persisted.
ALTER TABLE public.zoom_meetings
  DROP COLUMN IF EXISTS start_url;

CREATE OR REPLACE FUNCTION public.delete_zoom_integrations_for_user(
  p_zoom_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF nullif(btrim(p_zoom_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'A Zoom user identifier is required' USING ERRCODE = 'not_null_violation';
  END IF;

  DELETE FROM public.zoom_meetings
  WHERE workspace_id IN (
    SELECT workspace_id
    FROM public.zoom_connections
    WHERE zoom_user_id = p_zoom_user_id
  );

  DELETE FROM private.integration_oauth_tokens
  WHERE provider = 'zoom'
    AND workspace_id IN (
      SELECT workspace_id
      FROM public.zoom_connections
      WHERE zoom_user_id = p_zoom_user_id
    );

  DELETE FROM public.zoom_connections
  WHERE zoom_user_id = p_zoom_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_zoom_integrations_for_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_zoom_integrations_for_user(text) TO service_role;

COMMIT;
