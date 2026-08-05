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

-- The prior reliability migration is already present in the target project,
-- so redefine its two connection RPCs here as well. This keeps reconnect and
-- manual disconnect safe for databases that have already applied it.
CREATE OR REPLACE FUNCTION public.save_integration_oauth_connection(
  p_provider text,
  p_workspace_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz,
  p_connection jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_connected_by uuid;
  v_channel_id text;
  v_channel_title text;
  v_zoom_user_id text;
  v_email text;
  v_display_name text;
  v_existing_zoom_user_id text;
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR nullif(btrim(p_access_token), '') IS NULL
    OR nullif(btrim(p_refresh_token), '') IS NULL
    OR p_token_expires_at IS NULL
    OR jsonb_typeof(p_connection) <> 'object'
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth connection payload' USING ERRCODE = 'check_violation';
  END IF;

  v_connected_by := nullif(btrim(p_connection ->> 'connected_by'), '')::uuid;
  IF v_connected_by IS NULL THEN
    RAISE EXCEPTION 'A connection owner is required' USING ERRCODE = 'not_null_violation';
  END IF;

  INSERT INTO private.integration_oauth_tokens (
    provider, workspace_id, access_token, refresh_token, token_expires_at,
    refresh_lock_id, refresh_lock_expires_at
  ) VALUES (
    p_provider, p_workspace_id, p_access_token, p_refresh_token, p_token_expires_at,
    NULL, NULL
  )
  ON CONFLICT (provider, workspace_id) DO UPDATE
  SET access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now();

  IF p_provider = 'youtube' THEN
    v_channel_id := nullif(btrim(p_connection ->> 'channel_id'), '');
    v_channel_title := nullif(btrim(p_connection ->> 'channel_title'), '');
    IF v_channel_id IS NULL OR v_channel_title IS NULL THEN
      RAISE EXCEPTION 'YouTube channel metadata is required' USING ERRCODE = 'not_null_violation';
    END IF;

    INSERT INTO public.youtube_connections (
      workspace_id, channel_id, channel_title, token_expires_at, status, connected_by
    ) VALUES (
      p_workspace_id, v_channel_id, v_channel_title, p_token_expires_at, 'active', v_connected_by
    )
    ON CONFLICT (workspace_id) DO UPDATE
    SET channel_id = EXCLUDED.channel_id,
        channel_title = EXCLUDED.channel_title,
        token_expires_at = EXCLUDED.token_expires_at,
        status = 'active',
        connected_by = EXCLUDED.connected_by;
    RETURN;
  END IF;

  v_zoom_user_id := nullif(btrim(p_connection ->> 'zoom_user_id'), '');
  v_email := nullif(btrim(p_connection ->> 'email'), '');
  v_display_name := nullif(btrim(p_connection ->> 'display_name'), '');
  IF v_zoom_user_id IS NULL OR v_email IS NULL OR v_display_name IS NULL THEN
    RAISE EXCEPTION 'Zoom account metadata is required' USING ERRCODE = 'not_null_violation';
  END IF;

  SELECT zoom_user_id INTO v_existing_zoom_user_id
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_existing_zoom_user_id IS NOT NULL
    AND v_existing_zoom_user_id IS DISTINCT FROM v_zoom_user_id
  THEN
    -- Both rows are linked to the immutable local meeting ID. This does not
    -- touch other notification types in the workspace.
    DELETE FROM public.notification_deliveries AS delivery
    USING public.zoom_meetings AS meeting
    WHERE meeting.workspace_id = p_workspace_id
      AND delivery.event_key = format('meeting.created:%s', meeting.id);

    DELETE FROM public.notification_outbox AS outbox_row
    USING public.zoom_meetings AS meeting
    WHERE meeting.workspace_id = p_workspace_id
      AND outbox_row.event_type = 'meeting.created'
      AND outbox_row.entity_type = 'meeting'
      AND outbox_row.entity_id = meeting.id
      AND outbox_row.event_key = format('meeting.created:%s', meeting.id);

    DELETE FROM public.zoom_meetings WHERE workspace_id = p_workspace_id;
  END IF;

  INSERT INTO public.zoom_connections (
    workspace_id, zoom_user_id, email, display_name, token_expires_at, status, connected_by
  ) VALUES (
    p_workspace_id, v_zoom_user_id, v_email, v_display_name, p_token_expires_at, 'active', v_connected_by
  )
  ON CONFLICT (workspace_id) DO UPDATE
  SET zoom_user_id = EXCLUDED.zoom_user_id,
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      token_expires_at = EXCLUDED.token_expires_at,
      status = 'active',
      connected_by = EXCLUDED.connected_by;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_integration_oauth_connection(
  p_provider text,
  p_workspace_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom') THEN
    RAISE EXCEPTION 'Unknown integration provider' USING ERRCODE = 'check_violation';
  END IF;

  IF p_provider = 'youtube' THEN
    DELETE FROM private.integration_oauth_tokens
    WHERE provider = p_provider AND workspace_id = p_workspace_id;
    DELETE FROM public.youtube_connections WHERE workspace_id = p_workspace_id;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  DELETE FROM public.notification_deliveries AS delivery
  USING public.zoom_meetings AS meeting
  WHERE meeting.workspace_id = p_workspace_id
    AND delivery.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.notification_outbox AS outbox_row
  USING public.zoom_meetings AS meeting
  WHERE meeting.workspace_id = p_workspace_id
    AND outbox_row.event_type = 'meeting.created'
    AND outbox_row.entity_type = 'meeting'
    AND outbox_row.entity_id = meeting.id
    AND outbox_row.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.zoom_meetings WHERE workspace_id = p_workspace_id;
  DELETE FROM private.integration_oauth_tokens
  WHERE provider = p_provider AND workspace_id = p_workspace_id;
  DELETE FROM public.zoom_connections WHERE workspace_id = p_workspace_id;
END;
$$;

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

  PERFORM 1
  FROM public.zoom_connections
  WHERE zoom_user_id = p_zoom_user_id
  FOR UPDATE;

  DELETE FROM public.notification_deliveries AS delivery
  USING public.zoom_meetings AS meeting
  JOIN public.zoom_connections AS connection
    ON connection.workspace_id = meeting.workspace_id
  WHERE connection.zoom_user_id = p_zoom_user_id
    AND delivery.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.notification_outbox AS outbox_row
  USING public.zoom_meetings AS meeting
  JOIN public.zoom_connections AS connection
    ON connection.workspace_id = meeting.workspace_id
  WHERE connection.zoom_user_id = p_zoom_user_id
    AND outbox_row.event_type = 'meeting.created'
    AND outbox_row.entity_type = 'meeting'
    AND outbox_row.entity_id = meeting.id
    AND outbox_row.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.zoom_meetings AS meeting
  USING public.zoom_connections AS connection
  WHERE connection.workspace_id = meeting.workspace_id
    AND connection.zoom_user_id = p_zoom_user_id;

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

-- Remove legacy delivery/outbox rows whose local meeting source no longer
-- exists. The predicates are deliberately limited to the known meeting event
-- type, local entity ID, and canonical event key.
DELETE FROM public.notification_deliveries AS delivery
WHERE delivery.event_key LIKE 'meeting.created:%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.zoom_meetings AS meeting
    WHERE delivery.event_key = format('meeting.created:%s', meeting.id)
  );

DELETE FROM public.notification_outbox AS outbox_row
WHERE outbox_row.event_type = 'meeting.created'
  AND outbox_row.entity_type = 'meeting'
  AND NOT EXISTS (
    SELECT 1
    FROM public.zoom_meetings AS meeting
    WHERE meeting.id = outbox_row.entity_id
      AND meeting.workspace_id = outbox_row.workspace_id
      AND outbox_row.event_key = format('meeting.created:%s', meeting.id)
  );

REVOKE ALL ON FUNCTION public.save_integration_oauth_connection(text, uuid, text, text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_integration_oauth_connection(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_zoom_integrations_for_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_integration_oauth_connection(text, uuid, text, text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integration_oauth_connection(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_zoom_integrations_for_user(text) TO service_role;

COMMIT;
