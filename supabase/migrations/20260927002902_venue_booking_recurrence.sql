-- One venue booking remains one user-facing series. The compact JSON rule is
-- stored on the parent; concrete occupied slots are materialized below it so
-- the existing unique index remains the authoritative conflict guard.
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS recurrence jsonb NULL;

ALTER TABLE public.venue_booking_slots
  ADD COLUMN IF NOT EXISTS occurrence_index integer NOT NULL DEFAULT 0;

ALTER TABLE public.venue_booking_slots
  DROP CONSTRAINT IF EXISTS venue_booking_slots_occurrence_index_check;
ALTER TABLE public.venue_booking_slots
  ADD CONSTRAINT venue_booking_slots_occurrence_index_check
  CHECK (occurrence_index >= 0);

CREATE INDEX IF NOT EXISTS idx_venue_booking_slots_booking_occurrence
  ON public.venue_booking_slots (venue_booking_id, occurrence_index, slot_start);

CREATE OR REPLACE FUNCTION private.venue_recurrence_dates(
  p_start_date date,
  p_recurrence jsonb
)
RETURNS TABLE (occurrence_index integer, occurrence_date date)
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_frequency text;
  v_interval integer;
  v_weekdays integer[];
  v_end_type text;
  v_end_date date;
  v_target_count integer;
  v_emitted integer := 0;
  v_step integer := 0;
  v_candidate date;
  v_week_start date;
  v_weekday integer;
BEGIN
  IF p_recurrence IS NULL THEN
    RETURN QUERY SELECT 0, p_start_date;
    RETURN;
  END IF;

  IF jsonb_typeof(p_recurrence) <> 'object'
    OR NOT (p_recurrence ?& ARRAY['frequency', 'interval', 'weekdays', 'end'])
    OR jsonb_typeof(p_recurrence->'weekdays') <> 'array'
    OR jsonb_typeof(p_recurrence->'end') <> 'object'
  THEN
    RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
  END IF;

  v_frequency := p_recurrence->>'frequency';
  IF v_frequency NOT IN ('day', 'week', 'month')
    OR coalesce(p_recurrence->>'interval', '') !~ '^[0-9]+$'
  THEN
    RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
  END IF;
  v_interval := (p_recurrence->>'interval')::integer;
  IF v_interval < 1 OR v_interval > 365 THEN
    RAISE EXCEPTION 'The repeat interval must be between 1 and 365.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(array_agg(DISTINCT value::integer ORDER BY value::integer), ARRAY[]::integer[])
  INTO v_weekdays
  FROM jsonb_array_elements_text(p_recurrence->'weekdays') AS weekday(value)
  WHERE value ~ '^[1-7]$';
  IF jsonb_array_length(p_recurrence->'weekdays') > 7
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(p_recurrence->'weekdays') AS weekday(value)
      WHERE value !~ '^[1-7]$'
    )
    OR coalesce(array_length(v_weekdays, 1), 0) <> jsonb_array_length(p_recurrence->'weekdays')
  THEN
    RAISE EXCEPTION 'Choose valid weekdays without duplicates.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_frequency = 'week' AND coalesce(array_length(v_weekdays, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choose at least one weekday.' USING ERRCODE = 'check_violation';
  END IF;

  v_end_type := p_recurrence->'end'->>'type';
  IF v_end_type = 'year_end' THEN
    v_end_date := make_date(extract(year FROM p_start_date)::integer, 12, 31);
  ELSIF v_end_type = 'date' THEN
    IF coalesce(p_recurrence->'end'->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Choose a valid recurrence end date.' USING ERRCODE = 'check_violation';
    END IF;
    v_end_date := (p_recurrence->'end'->>'date')::date;
    IF v_end_date < p_start_date THEN
      RAISE EXCEPTION 'The recurrence cannot end before the first booking.' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_end_type = 'count' THEN
    IF coalesce(p_recurrence->'end'->>'count', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Choose a valid occurrence count.' USING ERRCODE = 'check_violation';
    END IF;
    v_target_count := (p_recurrence->'end'->>'count')::integer;
    IF v_target_count < 2 OR v_target_count > 366 THEN
      RAISE EXCEPTION 'Occurrence count must be between 2 and 366.' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    RAISE EXCEPTION 'Choose when the recurrence ends.' USING ERRCODE = 'check_violation';
  END IF;

  occurrence_index := v_emitted;
  occurrence_date := p_start_date;
  RETURN NEXT;
  v_emitted := 1;

  IF v_target_count = 1 OR (v_end_date IS NOT NULL AND p_start_date >= v_end_date) THEN RETURN; END IF;

  IF v_frequency = 'week' THEN
    v_week_start := p_start_date - (extract(isodow FROM p_start_date)::integer - 1);
    v_step := -1;
    LOOP
      v_step := v_step + 1;
      FOREACH v_weekday IN ARRAY v_weekdays LOOP
        v_candidate := v_week_start + (v_step * v_interval * 7) + (v_weekday - 1);
        IF v_candidate <= p_start_date THEN CONTINUE; END IF;
        IF v_end_date IS NOT NULL AND v_candidate > v_end_date THEN RETURN; END IF;
        IF v_target_count IS NULL AND v_emitted >= 366 THEN
          RAISE EXCEPTION 'Repeat patterns can contain at most 366 occurrences.' USING ERRCODE = 'check_violation';
        END IF;
        occurrence_index := v_emitted;
        occurrence_date := v_candidate;
        RETURN NEXT;
        v_emitted := v_emitted + 1;
        IF v_target_count IS NOT NULL AND v_emitted >= v_target_count THEN RETURN; END IF;
      END LOOP;
    END LOOP;
  END IF;

  LOOP
    v_step := v_step + 1;
    IF v_frequency = 'day' THEN
      v_candidate := p_start_date + (v_step * v_interval);
    ELSIF v_frequency = 'month' THEN
      v_candidate := (p_start_date + make_interval(months => v_step * v_interval))::date;
    ELSE
      RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_end_date IS NOT NULL AND v_candidate > v_end_date THEN RETURN; END IF;
    IF v_target_count IS NULL AND v_emitted >= 366 THEN
      RAISE EXCEPTION 'Repeat patterns can contain at most 366 occurrences.' USING ERRCODE = 'check_violation';
    END IF;
    occurrence_index := v_emitted;
    occurrence_date := v_candidate;
    RETURN NEXT;
    v_emitted := v_emitted + 1;
    IF v_target_count IS NOT NULL AND v_emitted >= v_target_count THEN RETURN; END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.expand_venue_booking_slots(
  p_workspace_id uuid,
  p_slot_starts timestamptz[],
  p_recurrence jsonb
)
RETURNS TABLE (occurrence_index integer, slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_zone text := public.workspace_timezone(p_workspace_id);
  v_start_date date;
BEGIN
  IF coalesce(array_length(p_slot_starts, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choose at least one time slot.' USING ERRCODE = 'check_violation';
  END IF;
  v_start_date := (p_slot_starts[1] AT TIME ZONE v_zone)::date;

  RETURN QUERY
  SELECT
    recurrence_date.occurrence_index,
    ((recurrence_date.occurrence_date + (initial_slot.slot AT TIME ZONE v_zone)::time) AT TIME ZONE v_zone) AS slot_start,
    ((recurrence_date.occurrence_date + (initial_slot.slot AT TIME ZONE v_zone)::time) AT TIME ZONE v_zone) + interval '30 minutes' AS slot_end
  FROM private.venue_recurrence_dates(v_start_date, p_recurrence) AS recurrence_date
  CROSS JOIN unnest(p_slot_starts) AS initial_slot(slot);
END;
$$;

DROP FUNCTION IF EXISTS public.public_submit_venue_booking(uuid, uuid, text, timestamptz[], uuid, text, text);

CREATE OR REPLACE FUNCTION public.public_submit_venue_booking(
  p_workspace_id uuid,
  p_venue_id uuid,
  p_requested_by text,
  p_slot_starts timestamptz[],
  p_event_id uuid DEFAULT NULL,
  p_event_other text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_recurrence jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_slots timestamptz[];
  v_count integer;
  v_zone text;
  v_local_date date;
  v_booking_id uuid;
  v_tracking text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_event_other text := nullif(btrim(coalesce(p_event_other, '')), '');
  v_title text;
  v_occurrence_count integer;
BEGIN
  IF nullif(btrim(p_requested_by), '') IS NULL OR char_length(btrim(p_requested_by)) > 200 THEN
    RAISE EXCEPTION 'Enter who is booking this venue.' USING ERRCODE = 'check_violation';
  END IF;
  IF (p_event_id IS NULL) = (v_event_other IS NULL) THEN
    RAISE EXCEPTION 'Choose an event, or describe it under “Other”.' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(coalesce(v_event_other, '')) > 120 THEN
    RAISE EXCEPTION 'Keep the event description to 120 characters or fewer.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT event.name INTO v_title FROM public.venue_events AS event
    WHERE event.id = p_event_id AND event.workspace_id = p_workspace_id AND event.active;
    IF v_title IS NULL THEN RAISE EXCEPTION 'That event is not available.' USING ERRCODE = 'check_violation'; END IF;
  ELSE
    v_title := v_event_other;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = p_venue_id AND workspace_id = p_workspace_id AND active) THEN
    RAISE EXCEPTION 'That venue is not available for booking.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT array_agg(DISTINCT slot ORDER BY slot) INTO v_slots
  FROM unnest(coalesce(p_slot_starts, ARRAY[]::timestamptz[])) AS slot;
  v_count := coalesce(array_length(v_slots, 1), 0);
  IF v_count = 0 OR v_count > 30 THEN RAISE EXCEPTION 'Choose at least one valid time slot.' USING ERRCODE = 'check_violation'; END IF;
  v_zone := public.workspace_timezone(p_workspace_id);
  v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
  IF EXISTS (
    SELECT 1 FROM unnest(v_slots) AS slot
    WHERE NOT EXISTS (SELECT 1 FROM public.venue_slot_grid(p_workspace_id, v_local_date) AS grid WHERE grid.slot_start = slot)
  ) OR v_slots[v_count] <> v_slots[1] + make_interval(mins => 30 * (v_count - 1))
  THEN RAISE EXCEPTION 'Choose one continuous block within the bookable hours.' USING ERRCODE = 'check_violation'; END IF;
  IF v_slots[1] <= now() THEN RAISE EXCEPTION 'Choose a time in the future.' USING ERRCODE = 'check_violation'; END IF;

  DROP TABLE IF EXISTS pg_temp.recurrence_slots;
  CREATE TEMP TABLE recurrence_slots ON COMMIT DROP AS
  SELECT * FROM private.expand_venue_booking_slots(p_workspace_id, v_slots, p_recurrence);
  IF EXISTS (
    SELECT 1 FROM recurrence_slots AS requested
    WHERE requested.slot_start <= now()
      OR NOT EXISTS (
        SELECT 1 FROM public.venue_slot_grid(p_workspace_id, (requested.slot_start AT TIME ZONE v_zone)::date) AS grid
        WHERE grid.slot_start = requested.slot_start
      )
  ) THEN RAISE EXCEPTION 'One or more repeated times are not bookable.' USING ERRCODE = 'check_violation'; END IF;

  SELECT min(slot_start), max(slot_end) FILTER (WHERE occurrence_index = 0), count(DISTINCT occurrence_index)
  INTO v_starts_at, v_ends_at, v_occurrence_count FROM recurrence_slots;
  v_tracking := public.generate_tracking_code('VEN');

  INSERT INTO public.venue_bookings (
    workspace_id, venue_id, event_id, event_other, tracking_code, title,
    requested_by, notes, starts_at, ends_at, recurrence
  ) VALUES (
    p_workspace_id, p_venue_id, p_event_id, v_event_other, v_tracking, v_title,
    btrim(p_requested_by), nullif(btrim(coalesce(p_notes, '')), ''), v_starts_at, v_ends_at, p_recurrence
  ) RETURNING id INTO v_booking_id;

  BEGIN
    INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, occurrence_index, slot_start, slot_end)
    SELECT v_booking_id, p_venue_id, occurrence_index, slot_start, slot_end FROM recurrence_slots;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'One or more repeated times have already been booked. Choose a different pattern or time.' USING ERRCODE = 'unique_violation';
  END;

  RETURN jsonb_build_object(
    'id', v_booking_id, 'tracking_code', v_tracking, 'title', v_title,
    'starts_at', v_starts_at, 'ends_at', v_ends_at, 'occurrence_count', v_occurrence_count
  );
END;
$$;

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
    'status', CASE WHEN booking.status = 'cancelled' THEN 'cancelled'
      WHEN coalesce(occurrence_json.in_progress, false) THEN 'in_progress'
      WHEN now() >= coalesce(occurrence_json.last_ends_at, booking.ends_at) THEN 'completed'
      WHEN now() >= booking.starts_at THEN 'in_progress' ELSE 'booked' END,
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
  IF v_booking.status = 'cancelled' OR v_booking.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
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

REVOKE ALL ON FUNCTION private.venue_recurrence_dates(date, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.expand_venue_booking_slots(uuid, timestamptz[], jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_submit_venue_booking(uuid, uuid, text, timestamptz[], uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_submit_venue_booking(uuid, uuid, text, timestamptz[], uuid, text, text, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.api_lookup_tracking_venue_booking(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_update_tracking_venue_booking(text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_lookup_tracking_venue_booking(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_update_tracking_venue_booking(text, timestamptz, jsonb) TO service_role;
