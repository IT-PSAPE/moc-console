-- ============================================================
-- Phase 12 — Public Access: Tracking Codes, Anonymous RPCs
-- Requires: Phases 1-11 (all tables, indexes, triggers, helpers, RLS, RPCs, seed data)
-- ============================================================

-- ============================================================
-- Step 1: Add tracking_code columns
-- ============================================================

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE;

-- ============================================================
-- Step 2: Tracking code generation function
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_tracking_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
END;
$$;

-- ============================================================
-- Step 3: Trigger functions for auto-generating tracking codes
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_request_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('REQ');
    v_attempts := v_attempts + 1;

    -- Check uniqueness before assigning
    IF NOT EXISTS (SELECT 1 FROM public.requests WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique request tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('BKG');
    v_attempts := v_attempts + 1;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique booking tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS set_request_tracking_code ON public.requests;
CREATE TRIGGER set_request_tracking_code
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_tracking_code();

DROP TRIGGER IF EXISTS set_booking_tracking_code ON public.bookings;
CREATE TRIGGER set_booking_tracking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_tracking_code();

-- ============================================================
-- Step 4: Backfill existing rows with tracking codes
-- ============================================================

UPDATE public.requests
SET tracking_code = public.generate_tracking_code('REQ')
WHERE tracking_code IS NULL;

UPDATE public.bookings
SET tracking_code = public.generate_tracking_code('BKG')
WHERE tracking_code IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE public.requests
  ALTER COLUMN tracking_code SET NOT NULL;

ALTER TABLE public.bookings
  ALTER COLUMN tracking_code SET NOT NULL;

-- ============================================================
-- Step 5: Drop UNIQUE on bookings.tracking_code (batch bookings share one code)
-- ============================================================

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_tracking_code_key;

-- ============================================================
-- Step 6: Public submission RPCs (SECURITY DEFINER)
-- ============================================================

-- 6a. Submit a request anonymously
CREATE OR REPLACE FUNCTION public.public_submit_request(
  p_workspace_id   uuid,
  p_title          text,
  p_priority       public.request_priority,
  p_category       public.request_category,
  p_due_date       timestamptz,
  p_requested_by   text,
  p_who            text,
  p_what           text,
  p_when_text      text,
  p_where_text     text,
  p_why            text,
  p_how            text,
  p_notes          text DEFAULT NULL,
  p_flow           text DEFAULT NULL,
  p_content        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id   uuid;
  v_tracking     text;
BEGIN
  INSERT INTO public.requests (
    workspace_id, title, priority, category, due_date,
    requested_by, who, what, when_text, where_text, why, how,
    notes, flow, content
  )
  VALUES (
    p_workspace_id, p_title, p_priority, p_category, p_due_date,
    p_requested_by, p_who, p_what, p_when_text, p_where_text, p_why, p_how,
    p_notes, p_flow, p_content
  )
  RETURNING id, tracking_code INTO v_request_id, v_tracking;

  RETURN jsonb_build_object('id', v_request_id, 'tracking_code', v_tracking);
END;
$$;

-- 6b. Submit a batch of bookings with a shared tracking code
CREATE OR REPLACE FUNCTION public.public_submit_booking_batch(
  p_workspace_id       uuid,
  p_equipment_ids      uuid[],
  p_booked_by          text,
  p_checked_out_at     timestamptz,
  p_expected_return_at timestamptz,
  p_notes              text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking     text;
  v_equipment_id uuid;
  v_ids          uuid[] := '{}';
  v_booking_id   uuid;
BEGIN
  -- Generate one shared tracking code for the entire batch
  v_tracking := public.generate_tracking_code('BKG');

  FOREACH v_equipment_id IN ARRAY p_equipment_ids
  LOOP
    INSERT INTO public.bookings (
      workspace_id, equipment_id, booked_by,
      checked_out_at, expected_return_at, notes, tracking_code
    )
    VALUES (
      p_workspace_id, v_equipment_id, p_booked_by,
      p_checked_out_at, p_expected_return_at, p_notes, v_tracking
    )
    RETURNING id INTO v_booking_id;

    v_ids := v_ids || v_booking_id;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(v_ids), 'tracking_code', v_tracking);
END;
$$;

-- 6c. Browse equipment with availability for given dates (public)
CREATE OR REPLACE FUNCTION public.public_browse_equipment(
  p_workspace_id       uuid,
  p_checked_out_at     timestamptz DEFAULT NULL,
  p_expected_return_at timestamptz DEFAULT NULL,
  p_search             text DEFAULT NULL,
  p_category           public.equipment_category DEFAULT NULL
)
RETURNS TABLE (
  id             uuid,
  workspace_id   uuid,
  name           text,
  serial_number  text,
  category       public.equipment_category,
  status         public.equipment_status,
  location       text,
  notes          text,
  last_active_on date,
  thumbnail_url  text,
  is_available   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.workspace_id, e.name, e.serial_number,
      e.category, e.status, e.location, e.notes,
      e.last_active_on, e.thumbnail_url,
      -- Available if not in maintenance AND no overlapping active booking
      CASE
        WHEN e.status = 'maintenance' THEN false
        WHEN p_checked_out_at IS NULL OR p_expected_return_at IS NULL THEN
          e.status <> 'maintenance'
        ELSE NOT EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at < p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        )
      END AS is_available
    FROM public.equipment e
    WHERE e.workspace_id = p_workspace_id
      AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR e.category = p_category)
    ORDER BY
      -- Available items first
      CASE
        WHEN e.status = 'maintenance' THEN 1
        WHEN p_checked_out_at IS NOT NULL AND p_expected_return_at IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at < p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        ) THEN 1
        ELSE 0
      END,
      e.name;
END;
$$;

-- 6d. Look up a submission by tracking code (public)
--     Returns all bookings sharing the same tracking code
CREATE OR REPLACE FUNCTION public.public_lookup_tracking(
  p_tracking_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result   jsonb;
  v_bookings jsonb;
  v_code     text := upper(trim(p_tracking_code));
BEGIN
  -- Try requests first
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

  -- Try bookings — aggregate all bookings with matching tracking code
  SELECT jsonb_agg(jsonb_build_object(
    'id', b.id,
    'equipmentName', e.name,
    'status', b.status::text,
    'checkedOutAt', b.checked_out_at,
    'expectedReturnAt', b.expected_return_at,
    'returnedAt', b.returned_at
  )) INTO v_bookings
  FROM public.bookings b
  JOIN public.equipment e ON e.id = b.equipment_id
  WHERE b.tracking_code = v_code;

  IF v_bookings IS NOT NULL THEN
    -- Take shared fields from the first booking
    SELECT jsonb_build_object(
      'type', 'booking',
      'trackingCode', b.tracking_code,
      'bookedBy', b.booked_by,
      'checkedOutAt', b.checked_out_at,
      'expectedReturnAt', b.expected_return_at,
      'createdAt', b.checked_out_at,
      'items', v_bookings
    ) INTO v_result
    FROM public.bookings b
    WHERE b.tracking_code = v_code
    LIMIT 1;

    RETURN v_result;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- Step 7: Grant execute on public RPCs to anon and authenticated
-- ============================================================

GRANT EXECUTE ON FUNCTION public.public_submit_request(uuid, text, public.request_priority, public.request_category, timestamptz, text, text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid, uuid[], text, timestamptz, timestamptz, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category) TO anon;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO anon;

GRANT EXECUTE ON FUNCTION public.public_submit_request(uuid, text, public.request_priority, public.request_category, timestamptz, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid, uuid[], text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO authenticated;
