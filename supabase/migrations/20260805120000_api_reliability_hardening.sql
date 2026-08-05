-- API reliability and database-boundary hardening.
--
-- This migration is intentionally additive and is not applied by this
-- repository. Review it against the target project, then apply through the
-- normal Supabase migration workflow.

BEGIN;

-- The stale workflow changes only delivery bookkeeping. Do not let those
-- updates reset the business activity timestamp used to determine staleness.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('requests', 'bookings')
    AND (to_jsonb(NEW) - ARRAY[
      'updated_at',
      'stale_notified_at',
      'stale_notification_claimed_at',
      'stale_notification_event_key'
    ]) = (to_jsonb(OLD) - ARRAY[
      'updated_at',
      'stale_notified_at',
      'stale_notification_claimed_at',
      'stale_notification_event_key'
    ])
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Cover foreign keys that previously relied on a non-leading composite index
-- or no index at all. These support parent deletes and the API's lookups.
CREATE INDEX IF NOT EXISTS idx_checklist_item_assignees_user_id
  ON public.checklist_item_assignees (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id
  ON public.notification_recipients (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_routes_group_chat_id
  ON public.notification_routes (group_chat_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_workspace_id
  ON public.notification_outbox (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_route_id
  ON public.notification_deliveries (route_id)
  WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient_user_id
  ON public.notification_deliveries (recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_activity_actor_id
  ON public.request_activity (actor_id)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_comments_actor_id
  ON public.request_comments (actor_id);
CREATE INDEX IF NOT EXISTS idx_youtube_connections_connected_by
  ON public.youtube_connections (connected_by);
CREATE INDEX IF NOT EXISTS idx_streams_created_by
  ON public.streams (created_by);
CREATE INDEX IF NOT EXISTS idx_zoom_connections_connected_by
  ON public.zoom_connections (connected_by);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_created_by
  ON public.zoom_meetings (created_by);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_tokens_workspace_id
  ON private.integration_oauth_tokens (workspace_id);

-- Keep Zoom connection state visible to the console without exposing tokens.
ALTER TABLE public.zoom_connections
  ADD COLUMN IF NOT EXISTS status public.youtube_connection_status NOT NULL DEFAULT 'active';

-- Token refreshes need a lease before calling providers that rotate refresh
-- tokens. The lease prevents two serverless instances from spending the same
-- Zoom refresh token concurrently.
ALTER TABLE private.integration_oauth_tokens
  ADD COLUMN IF NOT EXISTS refresh_lock_id uuid NULL,
  ADD COLUMN IF NOT EXISTS refresh_lock_expires_at timestamptz NULL;

-- Writes public connection metadata and private credentials together. A
-- connection can therefore never appear active without usable credentials.
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

CREATE OR REPLACE FUNCTION public.try_acquire_integration_oauth_refresh_lock(
  p_provider text,
  p_workspace_id uuid,
  p_expected_refresh_token text,
  p_lock_id uuid,
  p_lock_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR p_lock_id IS NULL
    OR p_lock_expires_at IS NULL
    OR p_lock_expires_at <= now()
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth refresh lock' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE private.integration_oauth_tokens
  SET refresh_lock_id = p_lock_id,
      refresh_lock_expires_at = p_lock_expires_at,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
    AND (refresh_lock_expires_at IS NULL OR refresh_lock_expires_at <= now());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_integration_oauth_token_refresh(
  p_provider text,
  p_workspace_id uuid,
  p_expected_refresh_token text,
  p_lock_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  UPDATE private.integration_oauth_tokens
  SET access_token = p_access_token,
      refresh_token = p_refresh_token,
      token_expires_at = p_token_expires_at,
      refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
    AND refresh_lock_id = p_lock_id
    AND refresh_lock_expires_at > now();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_integration_oauth_refresh_lock(
  p_provider text,
  p_workspace_id uuid,
  p_lock_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  UPDATE private.integration_oauth_tokens
  SET refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_lock_id = p_lock_id;
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

  DELETE FROM private.integration_oauth_tokens
  WHERE provider = p_provider AND workspace_id = p_workspace_id;

  IF p_provider = 'youtube' THEN
    DELETE FROM public.youtube_connections WHERE workspace_id = p_workspace_id;
  ELSE
    DELETE FROM public.zoom_connections WHERE workspace_id = p_workspace_id;
  END IF;
END;
$$;

-- Superseded service-role RPCs allowed token-only writes/deletes that could
-- leave public connection metadata and private credentials out of sync.
DROP FUNCTION IF EXISTS public.save_integration_oauth_tokens(text, uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.delete_integration_oauth_tokens(text, uuid);
DROP FUNCTION IF EXISTS public.compare_and_swap_integration_oauth_tokens(text, uuid, text, text, text, timestamptz);

-- Stale items are now claimed separately from completion. A timed-out claim
-- retains its event key so retries cannot enqueue duplicate notifications.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS stale_notification_claimed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS stale_notification_event_key text NULL;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stale_notification_claimed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS stale_notification_event_key text NULL;

CREATE OR REPLACE FUNCTION public.claim_stale_requests()
RETURNS SETOF public.requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT request_row.id
    FROM public.requests AS request_row
    LEFT JOIN public.notification_settings AS settings
      ON settings.workspace_id = request_row.workspace_id
    WHERE request_row.status NOT IN ('archived', 'completed')
      AND request_row.updated_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
      AND (
        request_row.stale_notified_at IS NULL
        OR request_row.stale_notified_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
      )
      AND (
        request_row.stale_notification_claimed_at IS NULL
        OR request_row.stale_notification_claimed_at < now() - interval '10 minutes'
      )
    FOR UPDATE OF request_row SKIP LOCKED
  )
  UPDATE public.requests AS request_row
  SET stale_notification_claimed_at = now(),
      stale_notification_event_key = coalesce(
        request_row.stale_notification_event_key,
        format('request.stale:%s:%s', request_row.id, gen_random_uuid())
      )
  FROM candidates
  WHERE request_row.id = candidates.id
  RETURNING request_row.*;
$$;

CREATE OR REPLACE FUNCTION public.claim_stale_bookings()
RETURNS SETOF public.bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT booking_row.id
    FROM public.bookings AS booking_row
    LEFT JOIN public.notification_settings AS settings
      ON settings.workspace_id = booking_row.workspace_id
    WHERE booking_row.status NOT IN ('returned', 'archived')
      AND (
        booking_row.updated_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
        OR (booking_row.expected_return_at < now() AND booking_row.returned_at IS NULL)
      )
      AND (
        booking_row.stale_notified_at IS NULL
        OR booking_row.stale_notified_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
      )
      AND (
        booking_row.stale_notification_claimed_at IS NULL
        OR booking_row.stale_notification_claimed_at < now() - interval '10 minutes'
      )
    FOR UPDATE OF booking_row SKIP LOCKED
  )
  UPDATE public.bookings AS booking_row
  SET stale_notification_claimed_at = now(),
      stale_notification_event_key = coalesce(
        booking_row.stale_notification_event_key,
        format('booking.stale:%s:%s', booking_row.id, gen_random_uuid())
      )
  FROM candidates
  WHERE booking_row.id = candidates.id
  RETURNING booking_row.*;
$$;

CREATE OR REPLACE FUNCTION public.complete_stale_request_notification(
  p_request_id uuid,
  p_event_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.requests
  SET stale_notified_at = now(),
      stale_notification_claimed_at = NULL,
      stale_notification_event_key = NULL
  WHERE id = p_request_id
    AND stale_notification_event_key = p_event_key;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_stale_booking_notification(
  p_booking_id uuid,
  p_event_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.bookings
  SET stale_notified_at = now(),
      stale_notification_claimed_at = NULL,
      stale_notification_event_key = NULL
  WHERE id = p_booking_id
    AND stale_notification_event_key = p_event_key;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notification_outbox_event(
  p_workspace_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_event_key text,
  p_payload jsonb
)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF nullif(btrim(p_event_type), '') IS NULL
    OR nullif(btrim(p_entity_type), '') IS NULL
    OR p_entity_id IS NULL
    OR nullif(btrim(p_event_key), '') IS NULL
    OR jsonb_typeof(p_payload) <> 'object'
  THEN
    RAISE EXCEPTION 'Invalid notification outbox event' USING ERRCODE = 'check_violation';
  END IF;

  RETURN QUERY
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    p_workspace_id, p_event_type, p_entity_type, p_entity_id, p_event_key, p_payload
  )
  ON CONFLICT (event_key) DO UPDATE
  SET payload = public.notification_outbox.payload || EXCLUDED.payload
  RETURNING notification_outbox.id, notification_outbox.status;
END;
$$;

-- Durable Telegram webhook inbox. Telegram retries only non-2xx responses,
-- so successful receipt must be persisted before application processing.
CREATE TABLE IF NOT EXISTS public.telegram_webhook_updates (
  update_id bigint PRIMARY KEY,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz NULL DEFAULT now(),
  processed_at timestamptz NULL,
  last_error text NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_retry
  ON public.telegram_webhook_updates (processing_started_at)
  WHERE status IN ('processing', 'failed');

CREATE OR REPLACE FUNCTION public.claim_telegram_webhook_update(
  p_update_id bigint,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_update_id IS NULL OR p_update_id < 0 OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid Telegram update payload' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.telegram_webhook_updates (update_id, payload)
  VALUES (p_update_id, p_payload)
  ON CONFLICT (update_id) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  UPDATE public.telegram_webhook_updates
  SET payload = p_payload,
      status = 'processing',
      attempts = attempts + 1,
      processing_started_at = now(),
      processed_at = NULL,
      last_error = NULL
  WHERE update_id = p_update_id
    AND (
      status = 'failed'
      OR (status = 'processing' AND processing_started_at < now() - interval '5 minutes')
    );
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  SELECT status INTO v_status
  FROM public.telegram_webhook_updates
  WHERE update_id = p_update_id;
  RETURN coalesce(v_status, 'in_progress');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_telegram_webhook_update(p_update_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.telegram_webhook_updates
  SET status = 'processed',
      processed_at = now(),
      processing_started_at = NULL,
      last_error = NULL
  WHERE update_id = p_update_id
    AND status = 'processing';
$$;

CREATE OR REPLACE FUNCTION public.fail_telegram_webhook_update(
  p_update_id bigint,
  p_error text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.telegram_webhook_updates
  SET status = 'failed',
      processing_started_at = NULL,
      last_error = left(coalesce(p_error, 'Unknown Telegram processing error'), 1_000)
  WHERE update_id = p_update_id
    AND status = 'processing';
$$;

CREATE OR REPLACE FUNCTION public.consume_telegram_link_token(
  p_token text,
  p_telegram_chat_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF nullif(btrim(p_token), '') IS NULL OR nullif(btrim(p_telegram_chat_id), '') IS NULL THEN
    RETURN 'invalid_or_expired';
  END IF;

  DELETE FROM public.telegram_link_tokens
  WHERE token = p_token
    AND expires_at > now()
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN 'invalid_or_expired';
  END IF;

  UPDATE public.users
  SET telegram_chat_id = p_telegram_chat_id
  WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link token user does not exist';
  END IF;

  RETURN 'linked';
END;
$$;

-- Signed notification ingest gets replay protection independent of request
-- process lifetime. Only a digest/nonce is stored, never the signature.
CREATE TABLE IF NOT EXISTS public.notification_ingest_replays (
  nonce text PRIMARY KEY CHECK (char_length(nonce) BETWEEN 1 AND 256),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_ingest_replays_expires_at
  ON public.notification_ingest_replays (expires_at);

CREATE OR REPLACE FUNCTION public.claim_notification_ingest_nonce(
  p_nonce text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF char_length(coalesce(p_nonce, '')) NOT BETWEEN 1 AND 256
    OR p_expires_at IS NULL
    OR p_expires_at <= now()
  THEN
    RAISE EXCEPTION 'Invalid notification ingest nonce' USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.notification_ingest_replays
  WHERE nonce = p_nonce AND expires_at <= now();

  INSERT INTO public.notification_ingest_replays (nonce, expires_at)
  VALUES (p_nonce, p_expires_at)
  ON CONFLICT (nonce) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- Durable, privacy-preserving fixed-window API rate limiting.
CREATE TABLE IF NOT EXISTS public.api_rate_limit_windows (
  policy text NOT NULL CHECK (policy IN (
    'public_notification_wake',
    'signed_ingest',
    'oauth_mutation',
    'provider_proxy_read',
    'provider_proxy_write',
    'telegram_webhook',
    'authenticated_notification_mutation'
  )),
  subject_hash text NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy, subject_hash, window_started_at)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_windows_expiry
  ON public.api_rate_limit_windows (window_started_at);

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_policy text,
  p_subject_hash text
)
RETURNS TABLE (
  allowed boolean,
  limit_value integer,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_limit integer;
  v_window_seconds integer;
  v_window_started_at timestamptz;
  v_count integer;
  v_window_end timestamptz;
BEGIN
  CASE p_policy
    WHEN 'public_notification_wake' THEN v_limit := 12; v_window_seconds := 60;
    WHEN 'signed_ingest' THEN v_limit := 120; v_window_seconds := 60;
    WHEN 'oauth_mutation' THEN v_limit := 20; v_window_seconds := 300;
    WHEN 'provider_proxy_read' THEN v_limit := 120; v_window_seconds := 60;
    WHEN 'provider_proxy_write' THEN v_limit := 30; v_window_seconds := 300;
    WHEN 'telegram_webhook' THEN v_limit := 100; v_window_seconds := 60;
    WHEN 'authenticated_notification_mutation' THEN v_limit := 30; v_window_seconds := 60;
    ELSE RAISE EXCEPTION 'Unknown API rate-limit policy' USING ERRCODE = 'check_violation';
  END CASE;

  IF p_subject_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid API rate-limit subject' USING ERRCODE = 'check_violation';
  END IF;

  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM statement_timestamp()) / v_window_seconds) * v_window_seconds
  );
  v_window_end := v_window_started_at + make_interval(secs => v_window_seconds);

  INSERT INTO public.api_rate_limit_windows (
    policy, subject_hash, window_started_at, request_count
  ) VALUES (
    p_policy, p_subject_hash, v_window_started_at, 1
  )
  ON CONFLICT (policy, subject_hash, window_started_at) DO UPDATE
  SET request_count = public.api_rate_limit_windows.request_count + 1,
      updated_at = now()
  WHERE public.api_rate_limit_windows.request_count < v_limit
  RETURNING request_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT request_count INTO v_count
    FROM public.api_rate_limit_windows
    WHERE policy = p_policy
      AND subject_hash = p_subject_hash
      AND window_started_at = v_window_started_at;
    RETURN QUERY SELECT false, v_limit, greatest(v_limit - coalesce(v_count, v_limit), 0),
      greatest(1, ceil(extract(epoch FROM v_window_end - now())))::integer;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_limit, greatest(v_limit - v_count, 0), 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_api_maintenance_data()
RETURNS TABLE (
  rate_limit_windows bigint,
  notification_ingest_replays bigint,
  telegram_webhook_updates bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rate_limit_windows bigint;
  v_notification_ingest_replays bigint;
  v_telegram_webhook_updates bigint;
BEGIN
  DELETE FROM public.api_rate_limit_windows
  WHERE window_started_at < now() - interval '7 days';
  GET DIAGNOSTICS v_rate_limit_windows = ROW_COUNT;

  DELETE FROM public.notification_ingest_replays
  WHERE expires_at <= now();
  GET DIAGNOSTICS v_notification_ingest_replays = ROW_COUNT;

  DELETE FROM public.telegram_webhook_updates
  WHERE status IN ('processed', 'failed')
    AND coalesce(processed_at, received_at) < now() - interval '30 days';
  GET DIAGNOSTICS v_telegram_webhook_updates = ROW_COUNT;

  RETURN QUERY SELECT v_rate_limit_windows, v_notification_ingest_replays, v_telegram_webhook_updates;
END;
$$;

-- New private/public queues are service-role-only. RLS denies any accidental
-- client grant, while explicit function grants define the API boundary.
ALTER TABLE public.telegram_webhook_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_ingest_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limit_windows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telegram_webhook_updates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.notification_ingest_replays FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.api_rate_limit_windows FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.telegram_webhook_updates TO service_role;
GRANT ALL ON TABLE public.notification_ingest_replays TO service_role;
GRANT ALL ON TABLE public.api_rate_limit_windows TO service_role;

DO $$
DECLARE
  v_signature regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    to_regprocedure('public.get_integration_oauth_tokens(text,uuid)'),
    to_regprocedure('public.save_integration_oauth_connection(text,uuid,text,text,timestamptz,jsonb)'),
    to_regprocedure('public.try_acquire_integration_oauth_refresh_lock(text,uuid,text,uuid,timestamptz)'),
    to_regprocedure('public.complete_integration_oauth_token_refresh(text,uuid,text,uuid,text,text,timestamptz)'),
    to_regprocedure('public.release_integration_oauth_refresh_lock(text,uuid,uuid)'),
    to_regprocedure('public.delete_integration_oauth_connection(text,uuid)'),
    to_regprocedure('public.claim_stale_requests()'),
    to_regprocedure('public.claim_stale_bookings()'),
    to_regprocedure('public.complete_stale_request_notification(uuid,text)'),
    to_regprocedure('public.complete_stale_booking_notification(uuid,text)'),
    to_regprocedure('public.enqueue_notification_outbox_event(uuid,text,text,uuid,text,jsonb)'),
    to_regprocedure('public.claim_telegram_webhook_update(bigint,jsonb)'),
    to_regprocedure('public.complete_telegram_webhook_update(bigint)'),
    to_regprocedure('public.fail_telegram_webhook_update(bigint,text)'),
    to_regprocedure('public.consume_telegram_link_token(text,text)'),
    to_regprocedure('public.claim_notification_ingest_nonce(text,timestamptz)'),
    to_regprocedure('public.consume_api_rate_limit(text,text)'),
    to_regprocedure('public.purge_api_maintenance_data()')
  ]
  LOOP
    IF v_signature IS NULL THEN
      RAISE EXCEPTION 'Expected API reliability function is missing';
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
  END LOOP;
END;
$$;

-- Tell Postgres to evaluate auth.uid() once per statement in existing RLS
-- policies. Character classes deliberately avoid backslash escaping, so the
-- migration is independent of standard_conforming_strings settings. The
-- rewrite is textually equivalent and preserves every policy.
DO $$
DECLARE
  v_policy record;
  v_using text;
  v_check text;
  v_clauses text;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        regexp_replace(
          coalesce(qual, ''),
          '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
          '',
          'gi'
        ) ~ 'auth[.]uid[(][)]'
        OR regexp_replace(
          coalesce(with_check, ''),
          '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
          '',
          'gi'
        ) ~ 'auth[.]uid[(][)]'
      )
  LOOP
    v_using := CASE
      WHEN v_policy.qual IS NULL THEN NULL
      ELSE replace(
        regexp_replace(
          regexp_replace(
            v_policy.qual,
            '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
            '__moc_auth_uid__',
            'gi'
          ),
          'auth[.]uid[(][)]', '(select auth.uid())', 'g'
        ),
        '__moc_auth_uid__', '(select auth.uid())'
      )
    END;
    v_check := CASE
      WHEN v_policy.with_check IS NULL THEN NULL
      ELSE replace(
        regexp_replace(
          regexp_replace(
            v_policy.with_check,
            '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
            '__moc_auth_uid__',
            'gi'
          ),
          'auth[.]uid[(][)]', '(select auth.uid())', 'g'
        ),
        '__moc_auth_uid__', '(select auth.uid())'
      )
    END;
    v_clauses := concat_ws(' ',
      CASE WHEN v_using IS NULL THEN NULL ELSE format('USING (%s)', v_using) END,
      CASE WHEN v_check IS NULL THEN NULL ELSE format('WITH CHECK (%s)', v_check) END
    );
    EXECUTE format('ALTER POLICY %I ON %I.%I %s', v_policy.policyname, v_policy.schemaname, v_policy.tablename, v_clauses);
  END LOOP;
END;
$$;

COMMIT;
