-- Remove request priority without cascading into unrelated database objects.
-- Apply after deploying API code that no longer uses request_priority.
BEGIN;

DROP FUNCTION public.public_submit_request(uuid, text, public.request_priority, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.api_lookup_tracking_submission(p_tracking_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'type', 'request', 'id', request.id, 'trackingCode', request.tracking_code,
    'title', request.title, 'status', request.status::text,
    'category', request.category, 'categoryName', category.name,
    'requestedBy', request.requested_by, 'dueDate', request.due_date,
    'who', request.who, 'what', request.what, 'whenText', request.when_text,
    'whereText', request.where_text, 'why', request.why, 'how', request.how,
    'notes', request.notes, 'flow', request.flow,
    'createdAt', request.created_at, 'updatedAt', request.updated_at
  ) INTO v_result
  FROM public.requests AS request
  JOIN public.request_categories AS category
    ON category.workspace_id = request.workspace_id AND category.key = request.category
  WHERE request.tracking_code = v_code;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT jsonb_build_object(
    'type', 'booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title, 'status', booking.status::text, 'bookedBy', booking.booked_by,
    'checkedOutAt', booking.checked_out_at, 'expectedReturnAt', booking.expected_return_at,
    'returnedAt', booking.returned_at, 'notes', booking.notes,
    'requestedEquipment', to_jsonb(booking.requested_equipment),
    'otherEquipment', coalesce(booking.other_equipment, ''),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', item.id, 'equipmentId', equipment.id, 'equipmentName', equipment.name,
        'equipmentCategory', equipment.category::text
      ) ORDER BY equipment.name), '[]'::jsonb)
      FROM public.booking_items AS item
      JOIN public.equipment AS equipment ON equipment.id = item.equipment_id
      WHERE item.booking_id = booking.id
    )
  ) INTO v_result
  FROM public.bookings AS booking
  WHERE booking.tracking_code = v_code;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT jsonb_build_object(
    'type', 'venue_booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title,
    'status', public.venue_booking_phase(booking.status, booking.starts_at, booking.ends_at),
    'requestedBy', booking.requested_by, 'venueId', booking.venue_id,
    'venueName', venue.name, 'venueDescription', venue.description,
    'eventId', booking.event_id, 'eventName', event.name, 'eventOther', booking.event_other,
    'timeZone', public.workspace_timezone(booking.workspace_id),
    'startsAt', booking.starts_at, 'endsAt', booking.ends_at, 'notes', booking.notes,
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (
      SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot
      WHERE slot.venue_booking_id = booking.id
    )
  ) INTO v_result
  FROM public.venue_bookings AS booking
  JOIN public.venues AS venue ON venue.id = booking.venue_id
  LEFT JOIN public.venue_events AS event ON event.id = booking.event_id
  WHERE booking.tracking_code = v_code;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.api_update_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone, p_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_request public.requests%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_venue public.venue_bookings%ROWTYPE;
  v_entity_id uuid;
  v_workspace_id uuid;
  v_change_summary text;
  v_requested text[];
  v_other text;
  v_venue_id uuid;
  v_event_id uuid;
  v_event_other text;
  v_title text;
  v_venue_name text;
  v_slots timestamptz[];
  v_count integer;
  v_zone text;
  v_local_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
BEGIN
  IF jsonb_typeof(p_data) <> 'object' THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  IF p_type = 'request' THEN
    SELECT * INTO v_request FROM public.requests WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_request.status IN ('completed', 'archived') THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_request.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.request_categories
      WHERE workspace_id = v_request.workspace_id
        AND key = p_data->>'category'
        AND (active OR key = v_request.category)
    ) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    IF nullif(btrim(p_data->>'title'), '') IS NULL OR char_length(btrim(p_data->>'title')) > 120
      OR nullif(btrim(p_data->>'requestedBy'), '') IS NULL OR char_length(btrim(p_data->>'requestedBy')) > 200
      OR nullif(btrim(p_data->>'who'), '') IS NULL OR char_length(p_data->>'who') > 4000
      OR nullif(btrim(p_data->>'what'), '') IS NULL OR char_length(p_data->>'what') > 4000
      OR nullif(btrim(p_data->>'whenText'), '') IS NULL OR char_length(p_data->>'whenText') > 4000
      OR nullif(btrim(p_data->>'whereText'), '') IS NULL OR char_length(p_data->>'whereText') > 4000
      OR nullif(btrim(p_data->>'why'), '') IS NULL OR char_length(p_data->>'why') > 4000
      OR nullif(btrim(p_data->>'how'), '') IS NULL OR char_length(p_data->>'how') > 4000
      OR char_length(coalesce(p_data->>'notes', '')) > 10000
      OR char_length(coalesce(p_data->>'flow', '')) > 10000
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_change_summary := concat_ws(', ',
      CASE WHEN v_request.title IS DISTINCT FROM btrim(p_data->>'title') THEN 'title' END,
      CASE WHEN v_request.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
      CASE WHEN v_request.category IS DISTINCT FROM p_data->>'category' THEN 'category' END,
      CASE WHEN v_request.due_date IS DISTINCT FROM (p_data->>'dueDate')::timestamptz THEN 'due date' END,
      CASE WHEN v_request.who IS DISTINCT FROM btrim(p_data->>'who') OR v_request.what IS DISTINCT FROM btrim(p_data->>'what')
        OR v_request.when_text IS DISTINCT FROM btrim(p_data->>'whenText') OR v_request.where_text IS DISTINCT FROM btrim(p_data->>'whereText')
        OR v_request.why IS DISTINCT FROM btrim(p_data->>'why') OR v_request.how IS DISTINCT FROM btrim(p_data->>'how') THEN 'request details' END,
      CASE WHEN coalesce(v_request.notes, '') IS DISTINCT FROM btrim(p_data->>'notes') OR coalesce(v_request.flow, '') IS DISTINCT FROM btrim(p_data->>'flow') THEN 'notes' END
    );

    UPDATE public.requests SET
      title = btrim(p_data->>'title'), requested_by = btrim(p_data->>'requestedBy'),
      category = p_data->>'category', due_date = (p_data->>'dueDate')::timestamptz,
      who = btrim(p_data->>'who'), what = btrim(p_data->>'what'), when_text = btrim(p_data->>'whenText'),
      where_text = btrim(p_data->>'whereText'), why = btrim(p_data->>'why'), how = btrim(p_data->>'how'),
      notes = nullif(btrim(p_data->>'notes'), ''), flow = nullif(btrim(p_data->>'flow'), '')
    WHERE id = v_request.id;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_request.workspace_id, 'request.requester_updated', 'request', v_request.id,
      format('request.requester_updated:%s:%s', v_request.id, gen_random_uuid()),
      jsonb_build_object(
        'title', btrim(p_data->>'title'), 'status', v_request.status::text,
        'requesterName', btrim(p_data->>'requestedBy'), 'trackingCode', v_code,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_request.id;

  ELSIF p_type = 'booking' THEN
    SELECT * INTO v_booking FROM public.bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_booking.status::text <> 'booked' OR v_booking.checked_out_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

    SELECT coalesce(array_agg(DISTINCT btrim(item) ORDER BY btrim(item)), ARRAY[]::text[])
      INTO v_requested
    FROM jsonb_array_elements_text(p_data->'requestedEquipment') AS item
    WHERE nullif(btrim(item), '') IS NOT NULL;
    v_other := nullif(btrim(p_data->>'otherEquipment'), '');
    IF nullif(btrim(p_data->>'title'), '') IS NULL OR char_length(btrim(p_data->>'title')) > 120
      OR nullif(btrim(p_data->>'bookedBy'), '') IS NULL OR char_length(btrim(p_data->>'bookedBy')) > 200
      OR (p_data->>'checkedOutAt')::timestamptz <= now()
      OR (p_data->>'expectedReturnAt')::timestamptz <= (p_data->>'checkedOutAt')::timestamptz
      OR coalesce(array_length(v_requested, 1), 0) > 50
      OR EXISTS (SELECT 1 FROM unnest(v_requested) AS requested(item) WHERE char_length(item) > 120)
      OR char_length(coalesce(p_data->>'otherEquipment', '')) > 1000
      OR char_length(coalesce(p_data->>'notes', '')) > 10000
      OR (coalesce(array_length(v_requested, 1), 0) = 0 AND v_other IS NULL)
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_change_summary := concat_ws(', ',
      CASE WHEN v_booking.title IS DISTINCT FROM btrim(p_data->>'title') THEN 'title' END,
      CASE WHEN v_booking.booked_by IS DISTINCT FROM btrim(p_data->>'bookedBy') THEN 'requester' END,
      CASE WHEN v_booking.checked_out_at IS DISTINCT FROM (p_data->>'checkedOutAt')::timestamptz
        OR v_booking.expected_return_at IS DISTINCT FROM (p_data->>'expectedReturnAt')::timestamptz THEN 'booking dates' END,
      CASE WHEN v_booking.requested_equipment IS DISTINCT FROM v_requested OR v_booking.other_equipment IS DISTINCT FROM v_other THEN 'equipment' END,
      CASE WHEN coalesce(v_booking.notes, '') IS DISTINCT FROM btrim(p_data->>'notes') THEN 'notes' END
    );

    UPDATE public.bookings SET
      title = btrim(p_data->>'title'), booked_by = btrim(p_data->>'bookedBy'),
      checked_out_at = (p_data->>'checkedOutAt')::timestamptz,
      expected_return_at = (p_data->>'expectedReturnAt')::timestamptz,
      notes = nullif(btrim(p_data->>'notes'), ''), requested_equipment = v_requested, other_equipment = v_other
    WHERE id = v_booking.id;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_booking.workspace_id, 'booking.requester_updated', 'booking', v_booking.id,
      format('booking.requester_updated:%s:%s', v_booking.id, gen_random_uuid()),
      jsonb_build_object(
        'title', btrim(p_data->>'title'), 'status', v_booking.status::text,
        'requesterName', btrim(p_data->>'bookedBy'), 'trackingCode', v_code,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_booking.id;

  ELSIF p_type = 'venue_booking' THEN
    SELECT * INTO v_venue FROM public.venue_bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_venue.status = 'cancelled' OR v_venue.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_venue.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

    v_venue_id := (p_data->>'venueId')::uuid;
    v_event_id := nullif(p_data->>'eventId', '')::uuid;
    v_event_other := nullif(btrim(p_data->>'eventOther'), '');
    IF (v_event_id IS NULL) = (v_event_other IS NULL) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    SELECT venue.name INTO v_venue_name
    FROM public.venues AS venue
    WHERE venue.id = v_venue_id AND venue.workspace_id = v_venue.workspace_id
      AND (venue.active OR venue.id = v_venue.venue_id);
    IF v_venue_name IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    IF v_event_id IS NOT NULL THEN
      SELECT event.name INTO v_title
      FROM public.venue_events AS event
      WHERE event.id = v_event_id AND event.workspace_id = v_venue.workspace_id
        AND (event.active OR event.id = v_venue.event_id);
      IF v_title IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    ELSE
      v_title := left(v_event_other, 120);
    END IF;

    SELECT array_agg(DISTINCT slot ORDER BY slot) INTO v_slots
    FROM (
      SELECT value::timestamptz AS slot
      FROM jsonb_array_elements_text(p_data->'slotStarts')
    ) AS requested_slots;
    v_count := coalesce(array_length(v_slots, 1), 0);
    IF v_count = 0 OR v_slots[1] <= now() THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    v_zone := public.workspace_timezone(v_venue.workspace_id);
    v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
    IF EXISTS (
      SELECT 1 FROM unnest(v_slots) AS slot
      WHERE NOT EXISTS (
        SELECT 1 FROM public.venue_slot_grid(v_venue.workspace_id, v_local_date) AS grid
        WHERE grid.slot_start = slot
      )
    ) OR v_slots[v_count] <> v_slots[1] + make_interval(mins => 30 * (v_count - 1))
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_starts_at := v_slots[1];
    v_ends_at := v_slots[v_count] + interval '30 minutes';
    v_change_summary := concat_ws(', ',
      CASE WHEN v_venue.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
      CASE WHEN v_venue.venue_id IS DISTINCT FROM v_venue_id THEN 'venue' END,
      CASE WHEN v_venue.event_id IS DISTINCT FROM v_event_id OR v_venue.event_other IS DISTINCT FROM v_event_other THEN 'event' END,
      CASE WHEN v_venue.starts_at IS DISTINCT FROM v_starts_at OR v_venue.ends_at IS DISTINCT FROM v_ends_at THEN 'booking time' END
    );

    DELETE FROM public.venue_booking_slots WHERE venue_booking_id = v_venue.id;
    UPDATE public.venue_bookings SET
      venue_id = v_venue_id, event_id = v_event_id, event_other = v_event_other,
      title = v_title, requested_by = btrim(p_data->>'requestedBy'),
      starts_at = v_starts_at, ends_at = v_ends_at
    WHERE id = v_venue.id;
    INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, slot_start, slot_end)
    SELECT v_venue.id, v_venue_id, slot, slot + interval '30 minutes' FROM unnest(v_slots) AS slot;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_venue.workspace_id, 'venue_booking.requester_updated', 'venue_booking', v_venue.id,
      format('venue_booking.requester_updated:%s:%s', v_venue.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_title, 'requesterName', btrim(p_data->>'requestedBy'), 'trackingCode', v_code,
        'venueName', v_venue_name, 'startsAt', v_starts_at, 'endsAt', v_ends_at,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_venue.id;
  ELSE
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'entityId', v_entity_id,
    'submission', public.api_lookup_tracking_submission(v_code)
  );
EXCEPTION
  WHEN check_violation OR not_null_violation OR foreign_key_violation OR unique_violation OR invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'invalid');
END;
$$;

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
    'notes', b.notes,
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
    'notes', vb.notes,
    'createdAt', vb.created_at
  ) INTO v_result
  FROM public.venue_bookings vb
  JOIN public.venues venue ON venue.id = vb.venue_id
  WHERE vb.tracking_code = v_code;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text DEFAULT NULL::text, p_flow text DEFAULT NULL::text, p_content text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_request_id uuid;
  v_tracking text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.request_categories
    WHERE workspace_id = p_workspace_id AND key = p_category AND active
  ) THEN
    RAISE EXCEPTION 'Choose an available request category.' USING ERRCODE = 'check_violation';
  END IF;
  IF nullif(btrim(p_title), '') IS NULL OR char_length(btrim(p_title)) > 120
    OR nullif(btrim(p_requested_by), '') IS NULL OR char_length(btrim(p_requested_by)) > 200
    OR nullif(btrim(p_who), '') IS NULL OR char_length(p_who) > 4000
    OR nullif(btrim(p_what), '') IS NULL OR char_length(p_what) > 4000
    OR nullif(btrim(p_when_text), '') IS NULL OR char_length(p_when_text) > 4000
    OR nullif(btrim(p_where_text), '') IS NULL OR char_length(p_where_text) > 4000
    OR nullif(btrim(p_why), '') IS NULL OR char_length(p_why) > 4000
    OR nullif(btrim(p_how), '') IS NULL OR char_length(p_how) > 4000
    OR char_length(coalesce(p_notes, '')) > 10000
    OR char_length(coalesce(p_flow, '')) > 10000
  THEN
    RAISE EXCEPTION 'Enter valid request details.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.requests (
    workspace_id, title, category, due_date, requested_by,
    who, what, when_text, where_text, why, how, notes, flow, content
  ) VALUES (
    p_workspace_id, btrim(p_title), p_category, p_due_date, btrim(p_requested_by),
    btrim(p_who), btrim(p_what), btrim(p_when_text), btrim(p_where_text), btrim(p_why), btrim(p_how),
    nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_flow, '')), ''), p_content
  )
  RETURNING id, tracking_code INTO v_request_id, v_tracking;

  RETURN jsonb_build_object('id', v_request_id, 'tracking_code', v_tracking);
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_request(uuid, text, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_submit_request(uuid, text, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text) TO moc_public;
GRANT ALL ON FUNCTION public.public_submit_request(uuid, text, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text) TO moc_app;
GRANT ALL ON FUNCTION public.public_submit_request(uuid, text, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text) TO moc_worker;

ALTER TABLE public.requests DROP COLUMN priority;
DROP TYPE public.request_priority;

-- Remove the retired token from saved request notifications as well as defaults.
-- Preserve other custom copy and tokens, including inline uses.
UPDATE public.notification_message_templates
SET body = regexp_replace(
  regexp_replace(body, '(^|\n)[^\n{}]*Priority:[[:blank:]]*\{\{[[:blank:]]*priority[[:blank:]]*\}\}[[:blank:]]*(\n|$)', E'\\1', 'gi'),
  '\{\{[[:space:]]*priority[[:space:]]*\}\}', '', 'gi'
)
WHERE message_type LIKE 'request.%' AND body ~* '\{\{[[:space:]]*priority[[:space:]]*\}\}';

COMMIT;
