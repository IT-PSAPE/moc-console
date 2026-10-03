-- Apply before deploying the matching console, request app, and API updates.
-- Existing venue notes become descriptions. Location and capacity are retired.
BEGIN;

ALTER TABLE public.request_categories ADD COLUMN description text;
ALTER TABLE public.venues RENAME COLUMN notes TO description;

DROP FUNCTION public.public_list_venues(uuid);
CREATE FUNCTION public.public_list_venues(p_workspace_id uuid)
RETURNS TABLE (id uuid, name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT venue.id, venue.name, venue.description
  FROM public.venues AS venue
  WHERE venue.workspace_id = p_workspace_id AND venue.active
  ORDER BY venue.sort_order, venue.name;
$$;
REVOKE ALL ON FUNCTION public.public_list_venues(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_list_venues(uuid) TO anon, authenticated;

DROP FUNCTION public.public_list_request_categories(uuid);
CREATE FUNCTION public.public_list_request_categories(p_workspace_id uuid)
RETURNS TABLE (key text, name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT category.key, category.name, category.description
  FROM public.request_categories AS category
  WHERE category.workspace_id = p_workspace_id AND category.active
  ORDER BY category.sort_order, category.name;
$$;
REVOKE ALL ON FUNCTION public.public_list_request_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_list_request_categories(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_lookup_tracking(
  p_tracking_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
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
    'priority', r.priority::text,
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

CREATE OR REPLACE FUNCTION public.api_lookup_tracking_submission(p_tracking_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'type', 'request', 'id', request.id, 'trackingCode', request.tracking_code,
    'title', request.title, 'status', request.status::text, 'priority', request.priority::text,
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

CREATE OR REPLACE FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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
    'notes', booking.notes,
    'recurrence', booking.recurrence, 'occurrences', coalesce(occurrence_json.items, '[]'::jsonb),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot WHERE slot.venue_booking_id = booking.id AND slot.occurrence_index = 0)
  )
  FROM matched AS booking
  LEFT JOIN occurrence_json ON occurrence_json.venue_booking_id = booking.id;
$$;

-- Keep custom templates valid when their venue field changes name.
UPDATE public.notification_message_templates
SET body = replace(body, '{{venueLocation}}', '{{venueDescription}}'), updated_at = now()
WHERE body LIKE '%{{venueLocation}}%';

ALTER TABLE public.venues DROP COLUMN location, DROP COLUMN capacity;
NOTIFY pgrst, 'reload schema';
COMMIT;
