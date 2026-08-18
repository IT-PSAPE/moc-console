-- Repointing a workspace's YouTube connection at a different channel now clears
-- that workspace's in-flight streams.
--
-- DESTRUCTIVE, but only for a workspace that authorises a different Google
-- channel than the one it had connected. Those rows already describe broadcasts
-- the new connection cannot read, and the daily stream-sync cron
-- (apps/api/server/streams/youtube-broadcast-sync.ts) gates deletion on the
-- authenticated channel matching youtube_connections.channel_id — a column the
-- reconnect itself rewrites. Without this the gate compares the new channel with
-- itself, an id lookup answers for none of the old channel's broadcasts, and the
-- unattended sweep deletes every one of them as "deleted on YouTube". The Zoom
-- branch of this same function has always worked this way: replacing the Zoom
-- account deletes the connection row and its meetings cascade away.
--
-- Finished streams are kept as history; only rows still in flight go.

BEGIN;

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
  v_existing_channel_id text;
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

    -- Locked after the private tokens, which is the order the YouTube disconnect
    -- path already uses.
    SELECT channel_id INTO v_existing_channel_id
    FROM public.youtube_connections
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_existing_channel_id IS NOT NULL
      AND v_existing_channel_id IS DISTINCT FROM v_channel_id
    THEN
      -- The workspace has authorised a different channel, so its in-flight
      -- streams belong to a channel this connection can no longer read. Nothing
      -- can start, stop or reconcile them again, and the sync's deletion gate —
      -- "the authenticated channel is the channel we recorded" — would otherwise
      -- be comparing the new channel against itself and read every one of those
      -- rows as deleted on YouTube. That happens here, in the reconnect the user
      -- just performed, instead of unattended in the daily sweep.
      --
      -- Finished streams are kept: they are history, they are never looked up by
      -- the sync, and so they are never deletion candidates.
      UPDATE public.notification_outbox AS outbox_row
      SET status = 'failed',
          next_attempt_at = now(),
          last_error = 'Retired: the YouTube connection was repointed at another channel'
      WHERE outbox_row.workspace_id = p_workspace_id
        AND outbox_row.status IN ('pending', 'processing')
        AND outbox_row.entity_type = 'stream'
        AND outbox_row.entity_id IN (
          SELECT stream.id
          FROM public.streams AS stream
          WHERE stream.workspace_id = p_workspace_id
            AND stream.stream_status <> 'complete'
            AND stream.actual_end_time IS NULL
        );

      UPDATE public.notification_deliveries AS delivery
      SET status = 'failed',
          next_attempt_at = now(),
          last_error = 'Retired: the YouTube connection was repointed at another channel'
      WHERE delivery.status IN ('pending', 'processing')
        AND delivery.event_key IN (
          SELECT format('stream.created:%s', stream.id)
          FROM public.streams AS stream
          WHERE stream.workspace_id = p_workspace_id
            AND stream.stream_status <> 'complete'
            AND stream.actual_end_time IS NULL
        );

      DELETE FROM public.streams
      WHERE workspace_id = p_workspace_id
        AND stream_status <> 'complete'
        AND actual_end_time IS NULL;
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

REVOKE ALL ON FUNCTION public.save_integration_oauth_connection(text, uuid, text, text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_integration_oauth_connection(text, uuid, text, text, timestamptz, jsonb) TO service_role;

COMMIT;
