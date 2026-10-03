-- Wires the 'approved' / 'rejected' venue booking states (added by
-- 20260927130000) into slot occupancy, the derived phase and requester
-- tracking, and adds the service-role RPC behind Telegram inline actions.

BEGIN;

-- ── 1. Decision audit columns ─────────────────────────────────
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejected_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.venue_bookings DROP CONSTRAINT IF EXISTS venue_bookings_approved_check;
ALTER TABLE public.venue_bookings ADD CONSTRAINT venue_bookings_approved_check
  CHECK ((status = 'approved') = (approved_at IS NOT NULL));
ALTER TABLE public.venue_bookings DROP CONSTRAINT IF EXISTS venue_bookings_rejected_check;
ALTER TABLE public.venue_bookings ADD CONSTRAINT venue_bookings_rejected_check
  CHECK ((status = 'rejected') = (rejected_at IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_venue_bookings_approved_by ON public.venue_bookings (approved_by);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_rejected_by ON public.venue_bookings (rejected_by);

-- ── 2. Rejected bookings release their slots, like cancelled ones ──
CREATE OR REPLACE FUNCTION public.enforce_venue_booking_slot_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_venue_id uuid;
  v_released boolean;
BEGIN
  SELECT venue_id, status IN ('cancelled', 'rejected')
    INTO v_venue_id, v_released
  FROM public.venue_bookings
  WHERE id = NEW.venue_booking_id;

  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Unknown venue booking' USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.venue_id := v_venue_id;
  NEW.active := NOT v_released;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_venue_booking_slot_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_active boolean := NEW.status NOT IN ('cancelled', 'rejected');
BEGIN
  UPDATE public.venue_booking_slots
  SET active = v_active
  WHERE venue_booking_id = NEW.id
    AND active <> v_active;
  RETURN NEW;
END;
$$;

-- A requester moving an approved booking needs a fresh decision.
CREATE OR REPLACE FUNCTION public.reset_venue_booking_approval_on_reschedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'approved'
     AND (NEW.venue_id, NEW.starts_at, NEW.ends_at, NEW.recurrence)
       IS DISTINCT FROM (OLD.venue_id, OLD.starts_at, OLD.ends_at, OLD.recurrence) THEN
    NEW.status := 'auto';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_bookings_reset_approval ON public.venue_bookings;
CREATE TRIGGER venue_bookings_reset_approval
  BEFORE UPDATE ON public.venue_bookings
  FOR EACH ROW EXECUTE FUNCTION public.reset_venue_booking_approval_on_reschedule();

-- ── 3. Derived phase ──────────────────────────────────────────
-- Mirrors packages/types/src/venues/phase.ts.
CREATE OR REPLACE FUNCTION public.venue_booking_phase(
  p_status    public.venue_booking_status,
  p_starts_at timestamptz,
  p_ends_at   timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_status = 'cancelled'  THEN 'cancelled'
    WHEN p_status = 'rejected'   THEN 'rejected'
    WHEN now() >= p_ends_at      THEN 'completed'
    WHEN now() >= p_starts_at    THEN 'in_progress'
    WHEN p_status = 'approved'   THEN 'approved'
    ELSE 'booked'
  END;
$$;

-- ── 4. Requester tracking: rejected bookings are locked ───────
CREATE OR REPLACE FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH matched AS (
    SELECT booking.*, venue.name AS venue_name, venue.location AS venue_location,
      event.name AS event_name, public.workspace_timezone(booking.workspace_id) AS time_zone
    FROM public.venue_bookings AS booking
    JOIN public.venues AS venue ON venue.id = booking.venue_id
    LEFT JOIN public.venue_events AS event ON event.id = booking.event_id
    WHERE booking.tracking_code = upper(btrim(p_tracking_code))
  ), occurrences AS (
    SELECT slot.venue_booking_id, slot.occurrence_index,
      min(slot.slot_start) AS starts_at, max(slot.slot_end) AS ends_at
    FROM public.venue_booking_slots AS slot
    JOIN matched ON matched.id = slot.venue_booking_id
    GROUP BY slot.venue_booking_id, slot.occurrence_index
  ), occurrence_json AS (
    SELECT venue_booking_id,
      jsonb_agg(jsonb_build_object('index', occurrence_index, 'startsAt', starts_at, 'endsAt', ends_at) ORDER BY occurrence_index) AS items,
      max(ends_at) AS last_ends_at,
      bool_or(now() >= starts_at AND now() < ends_at) AS in_progress
    FROM occurrences GROUP BY venue_booking_id
  )
  SELECT jsonb_build_object(
    'type', 'venue_booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title,
    'status', CASE WHEN booking.status IN ('cancelled', 'rejected') THEN booking.status::text
      WHEN coalesce(occurrence_json.in_progress, false) THEN 'in_progress'
      WHEN now() >= coalesce(occurrence_json.last_ends_at, booking.ends_at) THEN 'completed'
      WHEN now() >= booking.starts_at THEN 'in_progress'
      WHEN booking.status = 'approved' THEN 'approved' ELSE 'booked' END,
    'requestedBy', booking.requested_by, 'venueId', booking.venue_id,
    'venueName', booking.venue_name, 'venueLocation', booking.venue_location,
    'eventId', booking.event_id, 'eventName', booking.event_name, 'eventOther', booking.event_other,
    'timeZone', booking.time_zone, 'startsAt', booking.starts_at, 'endsAt', booking.ends_at,
    'notes', booking.notes,
    'recurrence', booking.recurrence, 'occurrences', coalesce(occurrence_json.items, '[]'::jsonb),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot WHERE slot.venue_booking_id = booking.id AND slot.occurrence_index = 0)
  )
  FROM matched AS booking
  LEFT JOIN occurrence_json ON occurrence_json.venue_booking_id = booking.id;
$$;

CREATE OR REPLACE FUNCTION public.api_update_tracking_venue_booking(
  p_tracking_code text,
  p_updated_at timestamptz,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_booking public.venue_bookings%ROWTYPE;
  v_venue_id uuid;
  v_event_id uuid;
  v_event_other text;
  v_title text;
  v_venue_name text;
  v_slots timestamptz[];
  v_zone text;
  v_local_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_change_summary text;
  v_recurrence jsonb;
BEGIN
  SELECT * INTO v_booking FROM public.venue_bookings
  WHERE tracking_code = upper(btrim(p_tracking_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_booking.status IN ('cancelled', 'rejected') OR v_booking.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
  IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

  v_venue_id := (p_data->>'venueId')::uuid;
  v_event_id := nullif(p_data->>'eventId', '')::uuid;
  v_event_other := nullif(btrim(p_data->>'eventOther'), '');
  v_recurrence := p_data->'recurrence';
  IF jsonb_typeof(v_recurrence) = 'null' THEN v_recurrence := NULL; END IF;
  IF nullif(btrim(p_data->>'requestedBy'), '') IS NULL OR char_length(btrim(p_data->>'requestedBy')) > 200
    OR (v_event_id IS NULL) = (v_event_other IS NULL) OR char_length(coalesce(v_event_other, '')) > 120
  THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  SELECT venue.name INTO v_venue_name FROM public.venues AS venue
  WHERE venue.id = v_venue_id AND venue.workspace_id = v_booking.workspace_id
    AND (venue.active OR venue.id = v_booking.venue_id);
  IF v_venue_name IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  IF v_event_id IS NOT NULL THEN
    SELECT event.name INTO v_title FROM public.venue_events AS event
    WHERE event.id = v_event_id AND event.workspace_id = v_booking.workspace_id
      AND (event.active OR event.id = v_booking.event_id);
    IF v_title IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  ELSE
    v_title := v_event_other;
  END IF;

  SELECT array_agg(DISTINCT value::timestamptz ORDER BY value::timestamptz) INTO v_slots
  FROM jsonb_array_elements_text(p_data->'slotStarts') AS requested(value);
  IF coalesce(array_length(v_slots, 1), 0) = 0 OR v_slots[1] <= now() THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  v_zone := public.workspace_timezone(v_booking.workspace_id);
  v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
  IF EXISTS (
    SELECT 1 FROM unnest(v_slots) AS slot
    WHERE NOT EXISTS (SELECT 1 FROM public.venue_slot_grid(v_booking.workspace_id, v_local_date) AS grid WHERE grid.slot_start = slot)
  ) OR v_slots[array_length(v_slots, 1)] <> v_slots[1] + make_interval(mins => 30 * (array_length(v_slots, 1) - 1))
  THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  DROP TABLE IF EXISTS pg_temp.recurrence_slots;
  CREATE TEMP TABLE recurrence_slots ON COMMIT DROP AS
  SELECT * FROM private.expand_venue_booking_slots(v_booking.workspace_id, v_slots, v_recurrence);
  IF EXISTS (
    SELECT 1 FROM recurrence_slots AS requested
    WHERE NOT EXISTS (
      SELECT 1 FROM public.venue_slot_grid(v_booking.workspace_id, (requested.slot_start AT TIME ZONE v_zone)::date) AS grid
      WHERE grid.slot_start = requested.slot_start
    )
  ) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  SELECT min(slot_start), max(slot_end) FILTER (WHERE occurrence_index = 0)
  INTO v_starts_at, v_ends_at FROM recurrence_slots;
  v_change_summary := concat_ws(', ',
    CASE WHEN v_booking.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
    CASE WHEN v_booking.venue_id IS DISTINCT FROM v_venue_id THEN 'venue' END,
    CASE WHEN v_booking.event_id IS DISTINCT FROM v_event_id OR v_booking.event_other IS DISTINCT FROM v_event_other THEN 'event' END,
    CASE WHEN v_booking.starts_at IS DISTINCT FROM v_starts_at OR v_booking.ends_at IS DISTINCT FROM v_ends_at THEN 'booking time' END,
    CASE WHEN v_booking.recurrence IS DISTINCT FROM v_recurrence THEN 'repeat pattern' END
  );

  DELETE FROM public.venue_booking_slots WHERE venue_booking_id = v_booking.id;
  UPDATE public.venue_bookings SET venue_id = v_venue_id, event_id = v_event_id,
    event_other = v_event_other, title = v_title, requested_by = btrim(p_data->>'requestedBy'),
    starts_at = v_starts_at, ends_at = v_ends_at, recurrence = v_recurrence
  WHERE id = v_booking.id;
  INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, occurrence_index, slot_start, slot_end)
  SELECT v_booking.id, v_venue_id, occurrence_index, slot_start, slot_end FROM recurrence_slots;

  INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
  VALUES (v_booking.workspace_id, 'venue_booking.requester_updated', 'venue_booking', v_booking.id,
    format('venue_booking.requester_updated:%s:%s', v_booking.id, gen_random_uuid()),
    jsonb_build_object('title', v_title, 'requesterName', btrim(p_data->>'requestedBy'),
      'trackingCode', upper(btrim(p_tracking_code)), 'venueName', v_venue_name,
      'startsAt', v_starts_at, 'endsAt', v_ends_at,
      'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')));

  RETURN jsonb_build_object('entityId', v_booking.id,
    'submission', public.api_lookup_tracking_venue_booking(p_tracking_code));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'conflict');
  WHEN check_violation OR not_null_violation OR foreign_key_violation OR invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'invalid');
END;
$$;

-- ── 5. Telegram delivery metadata ─────────────────────────────
-- Only "created" events post a new message. Every later event for the same
-- entity edits that original message and replies to it, so deliveries record
-- which entity they announce and which original a follow-up replied to.
ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS reply_markup jsonb NULL,
  ADD COLUMN IF NOT EXISTS entity_type text NULL,
  ADD COLUMN IF NOT EXISTS entity_id uuid NULL,
  ADD COLUMN IF NOT EXISTS parent_delivery_id uuid NULL
    REFERENCES public.notification_deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS telegram_deleted_at timestamptz NULL;

UPDATE public.notification_deliveries AS delivery
SET entity_type = outbox.entity_type,
    entity_id = outbox.entity_id
FROM public.notification_outbox AS outbox
WHERE outbox.event_key = delivery.event_key
  AND delivery.entity_id IS NULL;

CREATE INDEX IF NOT EXISTS notification_deliveries_entity_idx
  ON public.notification_deliveries (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_deliveries_parent_idx
  ON public.notification_deliveries (parent_delivery_id)
  WHERE parent_delivery_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_deliveries_telegram_message_idx
  ON public.notification_deliveries (chat_id, telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

-- ── 6. Telegram inline actions ────────────────────────────────
-- Called by the API webhook (service role) when someone presses an inline
-- button. The presser is identified by their Telegram user id, which equals
-- users.telegram_chat_id for linked accounts, and must hold can_update in the
-- entity's workspace. auth.uid() is pointed at that user for the rest of the
-- transaction so activity triggers attribute the change correctly. The
-- status_changed notification is suppressed because the webhook edits the
-- original message in place instead.
CREATE OR REPLACE FUNCTION public.api_apply_telegram_action(
  p_telegram_user_id text,
  p_entity_type      text,
  p_entity_id        uuid,
  p_action           text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id      uuid;
  v_user_name    text;
  v_workspace_id uuid;
  v_status       text;
  v_next         text;
BEGIN
  SELECT id, coalesce(nullif(btrim(concat_ws(' ', name, surname)), ''), email)
    INTO v_user_id, v_user_name
  FROM public.users
  WHERE telegram_chat_id = btrim(p_telegram_user_id);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_linked');
  END IF;

  IF p_entity_type = 'request' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'booking' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.bookings WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'venue_booking' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.venue_bookings WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_action');
  END IF;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_users AS membership
    JOIN public.roles AS role ON role.id = membership.role_id
    WHERE membership.workspace_id = v_workspace_id
      AND membership.user_id = v_user_id
      AND role.can_update
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_next := CASE
    WHEN p_entity_type = 'request' AND p_action = 'start'
      AND v_status = 'not_started' THEN 'in_progress'
    WHEN p_entity_type = 'request' AND p_action = 'complete'
      AND v_status IN ('not_started', 'in_progress') THEN 'completed'
    WHEN p_entity_type = 'booking' AND p_action = 'check_out'
      AND v_status = 'booked' THEN 'checked_out'
    WHEN p_entity_type = 'booking' AND p_action = 'return'
      AND v_status = 'checked_out' THEN 'returned'
    WHEN p_entity_type = 'venue_booking' AND p_action = 'approve'
      AND v_status = 'auto' THEN 'approved'
    WHEN p_entity_type = 'venue_booking' AND p_action = 'reject'
      AND v_status IN ('auto', 'approved') THEN 'rejected'
  END;

  IF v_next IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_transition', 'status', v_status,
      'workspaceId', v_workspace_id);
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);

  IF p_entity_type = 'request' THEN
    UPDATE public.requests SET status = v_next::public.request_status WHERE id = p_entity_id;
  ELSIF p_entity_type = 'booking' AND v_next = 'checked_out' THEN
    UPDATE public.bookings SET status = 'checked_out', checked_out_at = now() WHERE id = p_entity_id;
  ELSIF p_entity_type = 'booking' THEN
    UPDATE public.bookings SET status = 'returned', returned_at = now() WHERE id = p_entity_id;
  ELSIF v_next = 'approved' THEN
    UPDATE public.venue_bookings
    SET status = 'approved', approved_at = now(), approved_by = v_user_id,
        rejected_at = NULL, rejected_by = NULL
    WHERE id = p_entity_id;
  ELSE
    UPDATE public.venue_bookings
    SET status = 'rejected', rejected_at = now(), rejected_by = v_user_id,
        approved_at = NULL, approved_by = NULL
    WHERE id = p_entity_id;
  END IF;

  PERFORM set_config('moc.suppress_item_notifications', '', true);

  RETURN jsonb_build_object('workspaceId', v_workspace_id, 'previousStatus', v_status,
    'status', v_next, 'actorId', v_user_id, 'actorName', v_user_name);
END;
$$;

-- ── 7. Mini App rate-limit policy ────────────────────────────
-- Mirrors RATE_LIMIT_POLICIES.telegramMiniApp in apps/api/server/rate-limit-policy.ts.
ALTER TABLE public.api_rate_limit_windows
  DROP CONSTRAINT IF EXISTS api_rate_limit_windows_policy_check;
ALTER TABLE public.api_rate_limit_windows
  ADD CONSTRAINT api_rate_limit_windows_policy_check CHECK (policy IN (
    'public_notification_wake',
    'signed_ingest',
    'oauth_mutation',
    'provider_proxy_read',
    'provider_proxy_write',
    'telegram_webhook',
    'telegram_mini_app',
    'authenticated_notification_mutation',
    'public_submission_lookup',
    'public_submission_mutation'
  ));

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_policy text, p_subject_hash text)
RETURNS TABLE (allowed boolean, limit_value integer, remaining integer, retry_after_seconds integer)
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
    WHEN 'telegram_mini_app' THEN v_limit := 60; v_window_seconds := 60;
    WHEN 'authenticated_notification_mutation' THEN v_limit := 30; v_window_seconds := 60;
    WHEN 'public_submission_lookup' THEN v_limit := 20; v_window_seconds := 60;
    WHEN 'public_submission_mutation' THEN v_limit := 8; v_window_seconds := 300;
    ELSE RAISE EXCEPTION 'Unknown API rate-limit policy' USING ERRCODE = 'check_violation';
  END CASE;

  IF p_subject_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid API rate-limit subject' USING ERRCODE = 'check_violation';
  END IF;

  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM statement_timestamp()) / v_window_seconds) * v_window_seconds
  );
  v_window_end := v_window_started_at + make_interval(secs => v_window_seconds);

  INSERT INTO public.api_rate_limit_windows (policy, subject_hash, window_started_at, request_count)
  VALUES (p_policy, p_subject_hash, v_window_started_at, 1)
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

-- ── 8. Venue decision follow-ups ─────────────────────────────
-- Approve, reject and restore made in the console edit the original Telegram
-- announcement through a quiet venue_booking.status_changed follow-up.
-- Skipped when api_apply_telegram_action made the change (it edits the
-- message itself) and for the approved → auto reset on reschedule (the
-- requester_updated follow-up already covers that edit). Cancellation keeps
-- its own venue_booking.cancelled event.
CREATE OR REPLACE FUNCTION public.enqueue_venue_booking_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_venue_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status = 'cancelled'
     OR (OLD.status = 'approved' AND NEW.status = 'auto')
     OR coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_venue_name FROM public.venues WHERE id = NEW.venue_id;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'venue_booking.status_changed',
    'venue_booking',
    NEW.id,
    format('venue_booking.status_changed:%s:%s', NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'requesterName', NEW.requested_by,
      'trackingCode', NEW.tracking_code,
      'venueName', v_venue_name,
      'startsAt', NEW.starts_at,
      'endsAt', NEW.ends_at,
      'decision', NEW.status::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_bookings_enqueue_status_notification ON public.venue_bookings;
CREATE TRIGGER venue_bookings_enqueue_status_notification
  AFTER UPDATE OF status ON public.venue_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_venue_booking_status_notification();

REVOKE ALL ON FUNCTION public.enqueue_venue_booking_status_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_apply_telegram_action(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_apply_telegram_action(text, text, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.reset_venue_booking_approval_on_reschedule() FROM PUBLIC, anon, authenticated;

COMMIT;
