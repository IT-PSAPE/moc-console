-- Public requester self-service, stronger tracking codes, and managed request
-- categories. Browser mutations terminate at the MOC API; only service_role
-- can execute the tracking mutation functions below.

BEGIN;

-- ── API rate-limit policies ──────────────────────────────────
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

-- ── Workspace-managed request categories ─────────────────────
CREATE TABLE public.request_categories (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key          text        NOT NULL CHECK (char_length(btrim(key)) BETWEEN 1 AND 120),
  name         text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  active       boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT request_categories_workspace_key_key UNIQUE (workspace_id, key)
);

CREATE UNIQUE INDEX request_categories_workspace_name_key
  ON public.request_categories (workspace_id, lower(btrim(name)));
CREATE INDEX idx_request_categories_workspace_id
  ON public.request_categories (workspace_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.request_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.request_categories (workspace_id, key, name, sort_order)
SELECT workspace.id, seed.key, seed.name, seed.sort_order
FROM public.workspaces AS workspace
CROSS JOIN (VALUES
  ('video_production', 'Video Production', 10),
  ('video_shooting', 'Video Shooting', 20),
  ('graphic_design', 'Graphic Design', 30),
  ('event', 'Event', 40),
  ('education', 'Education', 50)
) AS seed(key, name, sort_order)
ON CONFLICT (workspace_id, key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_default_request_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.request_categories (workspace_id, key, name, sort_order)
  VALUES
    (NEW.id, 'video_production', 'Video Production', 10),
    (NEW.id, 'video_shooting', 'Video Shooting', 20),
    (NEW.id, 'graphic_design', 'Graphic Design', 30),
    (NEW.id, 'event', 'Event', 40),
    (NEW.id, 'education', 'Education', 50)
  ON CONFLICT (workspace_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_request_categories ON public.workspaces;
CREATE TRIGGER seed_default_request_categories
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION private.seed_default_request_categories();

REVOKE ALL ON FUNCTION private.seed_default_request_categories() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.public_submit_request(
  uuid, text, public.request_priority, public.request_category, timestamptz,
  text, text, text, text, text, text, text, text, text, text
);

ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_workspace_category_fkey;
ALTER TABLE public.requests
  ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.requests
  ADD CONSTRAINT requests_workspace_category_fkey
    FOREIGN KEY (workspace_id, category)
    REFERENCES public.request_categories(workspace_id, key)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_categories_select" ON public.request_categories
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_read')
  );
CREATE POLICY "request_categories_insert" ON public.request_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_create')
  );
CREATE POLICY "request_categories_update" ON public.request_categories
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_update')
  );
CREATE POLICY "request_categories_delete" ON public.request_categories
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_delete')
  );

CREATE OR REPLACE FUNCTION public.public_list_request_categories(p_workspace_id uuid)
RETURNS TABLE (key text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT category.key, category.name
  FROM public.request_categories AS category
  WHERE category.workspace_id = p_workspace_id
    AND category.active
  ORDER BY category.sort_order, category.name;
$$;

CREATE OR REPLACE FUNCTION public.public_submit_request(
  p_workspace_id uuid,
  p_title text,
  p_priority public.request_priority,
  p_category text,
  p_due_date timestamptz,
  p_requested_by text,
  p_who text,
  p_what text,
  p_when_text text,
  p_where_text text,
  p_why text,
  p_how text,
  p_notes text DEFAULT NULL,
  p_flow text DEFAULT NULL,
  p_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
    workspace_id, title, priority, category, due_date, requested_by,
    who, what, when_text, where_text, why, how, notes, flow, content
  ) VALUES (
    p_workspace_id, btrim(p_title), p_priority, p_category, p_due_date, btrim(p_requested_by),
    btrim(p_who), btrim(p_what), btrim(p_when_text), btrim(p_where_text), btrim(p_why), btrim(p_how),
    nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_flow, '')), ''), p_content
  )
  RETURNING id, tracking_code INTO v_request_id, v_tracking;

  RETURN jsonb_build_object('id', v_request_id, 'tracking_code', v_tracking);
END;
$$;

-- ── Equipment-request details and stronger future codes ──────
ALTER TABLE public.bookings
  ADD COLUMN requested_equipment text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN other_equipment text NULL;

CREATE OR REPLACE FUNCTION public.generate_tracking_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_prefix NOT IN ('REQ', 'BKG', 'VEN') THEN
    RAISE EXCEPTION 'Invalid tracking-code prefix' USING ERRCODE = 'check_violation';
  END IF;
  RETURN p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
END;
$$;

DROP FUNCTION IF EXISTS public.public_submit_booking_batch(
  uuid, text, uuid[], text, timestamptz, timestamptz, text
);

CREATE OR REPLACE FUNCTION public.public_submit_booking_batch(
  p_workspace_id uuid,
  p_title text,
  p_equipment_ids uuid[],
  p_booked_by text,
  p_checked_out_at timestamptz,
  p_expected_return_at timestamptz,
  p_notes text,
  p_requested_equipment text[],
  p_other_equipment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
    OR char_length(coalesce(p_notes, '')) > 10000
    OR (coalesce(array_length(v_requested, 1), 0) = 0 AND v_other IS NULL)
  THEN
    RAISE EXCEPTION 'Enter valid booking details.' USING ERRCODE = 'check_violation';
  END IF;

  v_tracking := public.generate_tracking_code('BKG');
  INSERT INTO public.bookings (
    workspace_id, tracking_code, title, booked_by, checked_out_at,
    expected_return_at, notes, requested_equipment, other_equipment
  ) VALUES (
    p_workspace_id, v_tracking, btrim(p_title), btrim(p_booked_by), p_checked_out_at,
    p_expected_return_at, nullif(btrim(coalesce(p_notes, '')), ''), v_requested, v_other
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

-- ── Service-role lookup ───────────────────────────────────────
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
    'venueName', venue.name, 'venueLocation', venue.location,
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

-- ── Service-role optimistic updates ──────────────────────────
CREATE OR REPLACE FUNCTION public.api_update_tracking_submission(
  p_tracking_code text,
  p_type text,
  p_updated_at timestamptz,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
      CASE WHEN v_request.priority::text IS DISTINCT FROM p_data->>'priority' THEN 'priority' END,
      CASE WHEN v_request.category IS DISTINCT FROM p_data->>'category' THEN 'category' END,
      CASE WHEN v_request.due_date IS DISTINCT FROM (p_data->>'dueDate')::timestamptz THEN 'due date' END,
      CASE WHEN v_request.who IS DISTINCT FROM btrim(p_data->>'who') OR v_request.what IS DISTINCT FROM btrim(p_data->>'what')
        OR v_request.when_text IS DISTINCT FROM btrim(p_data->>'whenText') OR v_request.where_text IS DISTINCT FROM btrim(p_data->>'whereText')
        OR v_request.why IS DISTINCT FROM btrim(p_data->>'why') OR v_request.how IS DISTINCT FROM btrim(p_data->>'how') THEN 'request details' END,
      CASE WHEN coalesce(v_request.notes, '') IS DISTINCT FROM btrim(p_data->>'notes') OR coalesce(v_request.flow, '') IS DISTINCT FROM btrim(p_data->>'flow') THEN 'notes' END
    );

    UPDATE public.requests SET
      title = btrim(p_data->>'title'), requested_by = btrim(p_data->>'requestedBy'),
      priority = (p_data->>'priority')::public.request_priority,
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

-- ── Service-role optimistic hard deletes ─────────────────────
CREATE OR REPLACE FUNCTION public.api_delete_tracking_submission(
  p_tracking_code text,
  p_type text,
  p_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_request public.requests%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_venue public.venue_bookings%ROWTYPE;
  v_venue_name text;
  v_entity_id uuid;
BEGIN
  IF p_type = 'request' THEN
    SELECT * INTO v_request FROM public.requests WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_request.status IN ('completed', 'archived') THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_request.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_request.workspace_id, 'request.requester_deleted', 'request', v_request.id,
      format('request.requester_deleted:%s:%s', v_request.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_request.title, 'status', v_request.status::text,
        'requesterName', v_request.requested_by, 'trackingCode', v_code,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_request.id;
    DELETE FROM public.requests WHERE id = v_request.id;

  ELSIF p_type = 'booking' THEN
    SELECT * INTO v_booking FROM public.bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_booking.status::text <> 'booked' OR v_booking.checked_out_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_booking.workspace_id, 'booking.requester_deleted', 'booking', v_booking.id,
      format('booking.requester_deleted:%s:%s', v_booking.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_booking.title, 'status', v_booking.status::text,
        'requesterName', v_booking.booked_by, 'trackingCode', v_code,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_booking.id;
    DELETE FROM public.bookings WHERE id = v_booking.id;

  ELSIF p_type = 'venue_booking' THEN
    SELECT * INTO v_venue FROM public.venue_bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_venue.status = 'cancelled' OR v_venue.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_venue.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    SELECT name INTO v_venue_name FROM public.venues WHERE id = v_venue.venue_id;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_venue.workspace_id, 'venue_booking.requester_deleted', 'venue_booking', v_venue.id,
      format('venue_booking.requester_deleted:%s:%s', v_venue.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_venue.title, 'requesterName', v_venue.requested_by, 'trackingCode', v_code,
        'venueName', v_venue_name, 'startsAt', v_venue.starts_at, 'endsAt', v_venue.ends_at,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_venue.id;
    DELETE FROM public.venue_bookings WHERE id = v_venue.id;
  ELSE
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN jsonb_build_object('entityId', v_entity_id);
END;
$$;

-- Existing created-event destinations are sensible defaults for the new
-- requester events. Operators can change them independently afterward.
INSERT INTO public.notification_routes (
  workspace_id, event_type, group_chat_id, thread_id, user_id, enabled
)
SELECT route.workspace_id, target.event_type, route.group_chat_id, route.thread_id, route.user_id, route.enabled
FROM public.notification_routes AS route
CROSS JOIN LATERAL (VALUES
  (CASE route.event_type
    WHEN 'request.created' THEN 'request.requester_updated'
    WHEN 'booking.created' THEN 'booking.requester_updated'
    WHEN 'venue_booking.created' THEN 'venue_booking.requester_updated'
  END),
  (CASE route.event_type
    WHEN 'request.created' THEN 'request.requester_deleted'
    WHEN 'booking.created' THEN 'booking.requester_deleted'
    WHEN 'venue_booking.created' THEN 'venue_booking.requester_deleted'
  END)
) AS target(event_type)
WHERE route.event_type IN ('request.created', 'booking.created', 'venue_booking.created')
ON CONFLICT DO NOTHING;

-- ── Grants and public-boundary retirement ─────────────────────
REVOKE ALL ON TABLE public.request_categories FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.request_categories TO authenticated;
GRANT UPDATE (name, active, sort_order) ON TABLE public.request_categories TO authenticated;
GRANT ALL ON TABLE public.request_categories TO service_role;

REVOKE ALL ON FUNCTION public.public_list_request_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_list_request_categories(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_submit_request(
  uuid, text, public.request_priority, text, timestamptz,
  text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_submit_request(
  uuid, text, public.request_priority, text, timestamptz,
  text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_submit_booking_batch(
  uuid, text, uuid[], text, timestamptz, timestamptz, text, text[], text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(
  uuid, text, uuid[], text, timestamptz, timestamptz, text, text[], text
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_lookup_tracking(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_lookup_tracking_submission(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_update_tracking_submission(text, text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_delete_tracking_submission(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_lookup_tracking_submission(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_update_tracking_submission(text, text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_delete_tracking_submission(text, text, timestamptz) TO service_role;

COMMIT;
