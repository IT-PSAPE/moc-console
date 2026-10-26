-- Retire general notes; purpose-specific equipment requests and venue event details remain.

DROP FUNCTION IF EXISTS public.public_browse_equipment(uuid,timestamptz,timestamptz,text,public.equipment_category);

CREATE OR REPLACE FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expected_return_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_search text DEFAULT NULL::text, p_category public.equipment_category DEFAULT NULL::public.equipment_category) RETURNS TABLE(id uuid, workspace_id uuid, name text, serial_number text, category public.equipment_category, status public.equipment_status, location text, last_active_on date, thumbnail_url text, is_available boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.workspace_id, e.name, e.serial_number,
      e.category, e.status, e.location,
      e.last_active_on, e.thumbnail_url,
      CASE
        WHEN e.status = 'maintenance' THEN false
        WHEN p_checked_out_at IS NULL OR p_expected_return_at IS NULL THEN
          e.status <> 'maintenance'
        ELSE NOT EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status NOT IN ('returned', 'archived')
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        )
      END AS is_available
    FROM public.equipment e
    WHERE e.workspace_id = p_workspace_id
      AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR e.category = p_category)
    ORDER BY
      CASE
        WHEN e.status = 'maintenance' THEN 1
        WHEN p_checked_out_at IS NOT NULL AND p_expected_return_at IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status NOT IN ('returned', 'archived')
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        ) THEN 1
        ELSE 0
      END,
      e.name;
END;
$$;

REVOKE ALL ON FUNCTION public.public_browse_equipment(uuid,timestamptz,timestamptz,text,public.equipment_category) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid,timestamptz,timestamptz,text,public.equipment_category) TO moc_public,moc_app,moc_worker;

CREATE OR REPLACE FUNCTION public.public_lookup_tracking(p_tracking_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_code   text := upper(btrim(p_tracking_code));
BEGIN
  SELECT jsonb_build_object(
    'type', 'request',
    'id', r.id,
    'trackingCode', r.tracking_code,
    'title', r.title,
    'status', r.status::text,
    'category', r.category::text,
    'requestedBy', r.requested_by,
    'dueDate', r.due_date,
    'createdAt', r.created_at
  ) INTO v_result
  FROM public.requests r
  WHERE r.tracking_code = v_code;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'type', 'booking',
    'id', b.id,
    'trackingCode', b.tracking_code,
    'title', b.title,
    'status', b.status::text,
    'bookedBy', b.booked_by,
    'checkedOutAt', b.checked_out_at,
    'expectedReturnAt', b.expected_return_at,
    'returnedAt', b.returned_at,
    'createdAt', b.created_at,
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', bi.id,
        'equipmentId', e.id,
        'equipmentName', e.name,
        'equipmentCategory', e.category::text
      ) ORDER BY e.name), '[]'::jsonb)
      FROM public.booking_items bi
      JOIN public.equipment e ON e.id = bi.equipment_id
      WHERE bi.booking_id = b.id
    )
  ) INTO v_result
  FROM public.bookings b
  WHERE b.tracking_code = v_code;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'type', 'venue_booking',
    'id', vb.id,
    'trackingCode', vb.tracking_code,
    'title', vb.title,
    'status', public.venue_booking_phase(vb.status, vb.starts_at, vb.ends_at),
    'requestedBy', vb.requested_by,
    'venueName', venue.name,
    'venueDescription', venue.description,
    'startsAt', vb.starts_at,
    'endsAt', vb.ends_at,
    'createdAt', vb.created_at
  ) INTO v_result
  FROM public.venue_bookings vb
  JOIN public.venues venue ON venue.id = vb.venue_id
  WHERE vb.tracking_code = v_code;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  WITH matched AS (
    SELECT booking.*, venue.name AS venue_name, venue.description AS venue_description,
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
    'venueName', booking.venue_name, 'venueDescription', booking.venue_description,
    'eventId', booking.event_id, 'eventName', booking.event_name, 'eventOther', booking.event_other,
    'timeZone', booking.time_zone, 'startsAt', booking.starts_at, 'endsAt', booking.ends_at,
    'recurrence', booking.recurrence, 'occurrences', coalesce(occurrence_json.items, '[]'::jsonb),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot WHERE slot.venue_booking_id = booking.id AND slot.occurrence_index = 0)
  )
  FROM matched AS booking
  LEFT JOIN occurrence_json ON occurrence_json.venue_booking_id = booking.id;
$$;

DROP FUNCTION IF EXISTS public.public_submit_booking_batch(uuid,text,uuid[],text,timestamptz,timestamptz,text,text[],text);

CREATE OR REPLACE FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_requested_equipment text[], p_other_equipment text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_booking_id uuid;
  v_tracking text;
  v_requested text[];
  v_other text := nullif(btrim(coalesce(p_other_equipment, '')), '');
BEGIN
  SELECT coalesce(array_agg(DISTINCT btrim(item) ORDER BY btrim(item)), ARRAY[]::text[])
    INTO v_requested
  FROM unnest(coalesce(p_requested_equipment, ARRAY[]::text[])) AS item
  WHERE nullif(btrim(item), '') IS NOT NULL;

  IF nullif(btrim(p_title), '') IS NULL OR char_length(btrim(p_title)) > 120
    OR nullif(btrim(p_booked_by), '') IS NULL OR char_length(btrim(p_booked_by)) > 200
    OR p_checked_out_at <= now()
    OR p_expected_return_at <= p_checked_out_at
    OR coalesce(array_length(v_requested, 1), 0) > 50
    OR EXISTS (SELECT 1 FROM unnest(v_requested) AS requested(item) WHERE char_length(item) > 120)
    OR char_length(coalesce(p_other_equipment, '')) > 1000
    OR (coalesce(array_length(v_requested, 1), 0) = 0 AND v_other IS NULL)
  THEN
    RAISE EXCEPTION 'Enter valid booking details.' USING ERRCODE = 'check_violation';
  END IF;

  v_tracking := public.generate_tracking_code('BKG');
  INSERT INTO public.bookings (
    workspace_id, tracking_code, title, booked_by, checked_out_at,
    expected_return_at, requested_equipment, other_equipment
  ) VALUES (
    p_workspace_id, v_tracking, btrim(p_title), btrim(p_booked_by), p_checked_out_at,
    p_expected_return_at, v_requested, v_other
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id)
  SELECT v_booking_id, equipment_id
  FROM unnest(coalesce(p_equipment_ids, ARRAY[]::uuid[])) AS equipment_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'tracking_code', v_tracking,
    'title', btrim(p_title)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_booking_batch(uuid,text,uuid[],text,timestamptz,timestamptz,text[],text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid,text,uuid[],text,timestamptz,timestamptz,text[],text) TO moc_public,moc_app,moc_worker;

DROP FUNCTION IF EXISTS public.public_submit_venue_booking(uuid,uuid,text,timestamptz[],uuid,text,text,jsonb);

CREATE OR REPLACE FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid DEFAULT NULL::uuid, p_event_other text DEFAULT NULL::text, p_recurrence jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
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
  SELECT * FROM moc_private.expand_venue_booking_slots(p_workspace_id, v_slots, p_recurrence);
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
    requested_by, starts_at, ends_at, recurrence
  ) VALUES (
    p_workspace_id, p_venue_id, p_event_id, v_event_other, v_tracking, v_title,
    btrim(p_requested_by), v_starts_at, v_ends_at, p_recurrence
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

REVOKE ALL ON FUNCTION public.public_submit_venue_booking(uuid,uuid,text,timestamptz[],uuid,text,jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_submit_venue_booking(uuid,uuid,text,timestamptz[],uuid,text,jsonb) TO moc_public,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO moc_public;
