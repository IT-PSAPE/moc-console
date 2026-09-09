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

  IF p_provider = 'youtube' THEN
    v_channel_id := nullif(btrim(p_connection ->> 'channel_id'), '');
    v_channel_title := nullif(btrim(p_connection ->> 'channel_title'), '');
    IF v_channel_id IS NULL OR v_channel_title IS NULL THEN
      RAISE EXCEPTION 'YouTube channel metadata is required' USING ERRCODE = 'not_null_violation';
    END IF;

    -- Preserve the existing YouTube write order.
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
    DELETE FROM public.zoom_connections
    WHERE workspace_id = p_workspace_id;
  END IF;

  -- Zoom disconnect/deauthorization lock the public connection before private
  -- tokens. Maintain that same order here to avoid a cross-table deadlock.
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

-- Reapply the refresh-token/status transition for deployments that have
-- already run the reliability migration. The private-token comparison holds a
-- row lock until the public status is updated, making this one atomic action.
-- Zoom takes the public connection lock first, matching its save/disconnect
-- operations; YouTube retains its established private-to-public order.
CREATE OR REPLACE FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(
  p_provider text,
  p_workspace_id uuid,
  p_expected_refresh_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR nullif(btrim(p_expected_refresh_token), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth reauthentication state' USING ERRCODE = 'check_violation';
  END IF;

  IF p_provider = 'youtube' THEN
    PERFORM 1
    FROM private.integration_oauth_tokens
    WHERE provider = p_provider
      AND workspace_id = p_workspace_id
      AND refresh_token = p_expected_refresh_token
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN false;
    END IF;

    UPDATE public.youtube_connections
    SET status = 'reauth_required'
    WHERE workspace_id = p_workspace_id;
    RETURN FOUND;
  END IF;

  PERFORM 1
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM private.integration_oauth_tokens
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.zoom_connections
  SET status = 'reauth_required'
  WHERE workspace_id = p_workspace_id;
  RETURN true;
END;
$$;

-- Redefine the deletion guard for databases that already applied the prior
-- reliability migration. Explicit deauthorization cleanup remains idempotent:
-- it clears rows first and this trigger then finds nothing left to remove.
CREATE OR REPLACE FUNCTION public.cleanup_zoom_meeting_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.notification_deliveries
  WHERE event_key = format('meeting.created:%s', OLD.id);

  DELETE FROM public.notification_outbox
  WHERE event_type = 'meeting.created'
    AND entity_type = 'meeting'
    AND entity_id = OLD.id
    AND workspace_id = OLD.workspace_id
    AND event_key = format('meeting.created:%s', OLD.id);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS zoom_meetings_cleanup_notifications ON public.zoom_meetings;
CREATE TRIGGER zoom_meetings_cleanup_notifications
  AFTER DELETE ON public.zoom_meetings
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_zoom_meeting_notifications();

-- Recreate the named relationship so this migration also converges databases
-- that already applied the earlier reliability migration. The trigger above
-- is invoked for these orphan deletions and for future cascade deletes.
ALTER TABLE public.zoom_meetings
  ADD COLUMN IF NOT EXISTS zoom_connection_id uuid NULL;

UPDATE public.zoom_meetings AS meeting
SET zoom_connection_id = connection.id
FROM public.zoom_connections AS connection
WHERE connection.workspace_id = meeting.workspace_id
  AND meeting.zoom_connection_id IS DISTINCT FROM connection.id;

DELETE FROM public.zoom_meetings AS meeting
WHERE NOT EXISTS (
  SELECT 1
  FROM public.zoom_connections AS connection
  WHERE connection.id = meeting.zoom_connection_id
    AND connection.workspace_id = meeting.workspace_id
);

ALTER TABLE public.zoom_meetings
  DROP CONSTRAINT IF EXISTS zoom_meetings_workspace_connection_fkey;
ALTER TABLE public.zoom_meetings
  DROP CONSTRAINT IF EXISTS zoom_meetings_connection_workspace_fkey;
ALTER TABLE public.zoom_connections
  DROP CONSTRAINT IF EXISTS zoom_connections_id_workspace_id_key;
ALTER TABLE public.zoom_connections
  ADD CONSTRAINT zoom_connections_id_workspace_id_key UNIQUE (id, workspace_id);
ALTER TABLE public.zoom_meetings
  ADD CONSTRAINT zoom_meetings_connection_workspace_fkey
  FOREIGN KEY (zoom_connection_id, workspace_id)
  REFERENCES public.zoom_connections(id, workspace_id)
  ON DELETE CASCADE;
ALTER TABLE public.zoom_meetings
  ALTER COLUMN zoom_connection_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_zoom_connection_workspace_id
  ON public.zoom_meetings (zoom_connection_id, workspace_id);

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
REVOKE ALL ON FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_zoom_meeting_notifications() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_zoom_integrations_for_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_integration_oauth_connection(text, uuid, text, text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integration_oauth_connection(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_zoom_integrations_for_user(text) TO service_role;

COMMIT;
