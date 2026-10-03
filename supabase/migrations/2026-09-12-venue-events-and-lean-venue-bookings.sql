-- 2026-09-12 — Venue events, and leaner venue bookings.
--
-- Two changes that belong together because they redefine what a venue booking
-- IS:
--
--   1. A venue booking no longer carries 5W1H prose. The public flow stopped
--      asking for it: someone now picks a venue, an EVENT, a day and a run of
--      slots, and nothing else. who / what / when_text / where_text / why /
--      how are therefore dropped from venue_bookings rather than left behind
--      as six permanently-null columns nothing writes.
--
--   2. Events are a workspace-managed list (public.venue_events), the same
--      shape as venues — the console defines them, the request app pulls them
--      in. "Other" is deliberately NOT a row: it is the absence of an event_id
--      plus free text in event_other, so nobody can rename, deactivate or
--      delete the escape hatch. The booking's title is derived from whichever
--      of the two is set, which is also why the flow no longer asks for a
--      title of its own.

BEGIN;

-- ── 1. Events ─────────────────────────────────────────────────
-- Mirrors public.venues: workspace-scoped, deactivated rather than deleted
-- once bookings point at it (venue_bookings.event_id is ON DELETE RESTRICT),
-- so a past booking never loses the event it was for.
CREATE TABLE IF NOT EXISTS public.venue_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description  text        NULL,
  active       boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venue_events_workspace_name_key
  ON public.venue_events (workspace_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_venue_events_workspace_id
  ON public.venue_events (workspace_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.venue_events;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.venue_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Reshape venue_bookings ─────────────────────────────────
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS event_id    uuid REFERENCES public.venue_events(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS event_other text NULL;

-- A booking names its event one way or the other, never both. Rows predating
-- this migration have neither, which the check deliberately still allows —
-- the "exactly one" requirement is enforced by the submit RPC, the only
-- writer, rather than by invalidating history.
ALTER TABLE public.venue_bookings
  DROP CONSTRAINT IF EXISTS venue_bookings_event_choice_check;
ALTER TABLE public.venue_bookings
  ADD CONSTRAINT venue_bookings_event_choice_check
    CHECK (event_id IS NULL OR event_other IS NULL);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_event_id
  ON public.venue_bookings (event_id);

ALTER TABLE public.venue_bookings
  DROP COLUMN IF EXISTS who,
  DROP COLUMN IF EXISTS what,
  DROP COLUMN IF EXISTS when_text,
  DROP COLUMN IF EXISTS where_text,
  DROP COLUMN IF EXISTS why,
  DROP COLUMN IF EXISTS how;

-- ── 3. Public RPCs ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_list_venue_events(p_workspace_id uuid)
RETURNS TABLE (
  id          uuid,
  name        text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT event.id, event.name, event.description
  FROM public.venue_events AS event
  WHERE event.workspace_id = p_workspace_id
    AND event.active
  ORDER BY event.sort_order, event.name;
$$;

-- The 5W1H and title arguments are gone, so the old signature has to go with
-- them: CREATE OR REPLACE cannot drop parameters, and leaving it in place
-- would make every call ambiguous.
DROP FUNCTION IF EXISTS public.public_submit_venue_booking(
  uuid, uuid, text, text, text, text, text, text, text, text, timestamptz[], text
);

CREATE OR REPLACE FUNCTION public.public_submit_venue_booking(
  p_workspace_id uuid,
  p_venue_id     uuid,
  p_requested_by text,
  p_slot_starts  timestamptz[],
  p_event_id     uuid DEFAULT NULL,
  p_event_other  text DEFAULT NULL,
  p_notes        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_slots       timestamptz[];
  v_count       integer;
  v_zone        text;
  v_local_date  date;
  v_booking_id  uuid;
  v_tracking    text;
  v_starts_at   timestamptz;
  v_ends_at     timestamptz;
  v_event_other text := nullif(btrim(coalesce(p_event_other, '')), '');
  v_title       text;
BEGIN
  IF nullif(btrim(p_requested_by), '') IS NULL THEN
    RAISE EXCEPTION 'Enter who is booking this venue.' USING ERRCODE = 'check_violation';
  END IF;

  -- Exactly one of the two ways of naming the event. Both would be
  -- contradictory (and the table's check would reject it anyway); neither
  -- leaves the booking with nothing to be called.
  IF (p_event_id IS NULL) = (v_event_other IS NULL) THEN
    RAISE EXCEPTION 'Choose an event, or describe it under “Other”.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT event.name
      INTO v_title
    FROM public.venue_events AS event
    WHERE event.id = p_event_id
      AND event.workspace_id = p_workspace_id
      AND event.active;

    IF v_title IS NULL THEN
      RAISE EXCEPTION 'That event is not available.' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- venue_bookings.title caps at 120 characters, so free text is trimmed to
    -- fit rather than rejected.
    v_title := left(v_event_other, 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.venues
    WHERE id = p_venue_id
      AND workspace_id = p_workspace_id
      AND active
  ) THEN
    RAISE EXCEPTION 'That venue is not available for booking.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT array_agg(DISTINCT slot ORDER BY slot)
    INTO v_slots
  FROM unnest(coalesce(p_slot_starts, ARRAY[]::timestamptz[])) AS slot;

  v_count := coalesce(array_length(v_slots, 1), 0);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Choose at least one time slot.' USING ERRCODE = 'check_violation';
  END IF;

  v_zone := public.workspace_timezone(p_workspace_id);
  v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;

  -- Every slot must sit on that one local day's grid. This is also what caps
  -- a booking at a single day and at 30 slots.
  IF EXISTS (
    SELECT 1
    FROM unnest(v_slots) AS slot
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.venue_slot_grid(p_workspace_id, v_local_date) AS grid
      WHERE grid.slot_start = slot
    )
  ) THEN
    RAISE EXCEPTION 'Those times are outside the bookable hours for a single day.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- One unbroken run: n distinct sorted slots spanning exactly n-1 steps.
  IF v_slots[v_count] <> v_slots[1] + make_interval(mins => 30 * (v_count - 1)) THEN
    RAISE EXCEPTION 'Choose one continuous block of time.' USING ERRCODE = 'check_violation';
  END IF;

  IF v_slots[1] <= now() THEN
    RAISE EXCEPTION 'Choose a time in the future.' USING ERRCODE = 'check_violation';
  END IF;

  v_starts_at := v_slots[1];
  v_ends_at := v_slots[v_count] + interval '30 minutes';
  v_tracking := public.generate_tracking_code('VEN');

  INSERT INTO public.venue_bookings (
    workspace_id, venue_id, event_id, event_other,
    tracking_code, title, requested_by, notes, starts_at, ends_at
  )
  VALUES (
    p_workspace_id, p_venue_id, p_event_id, v_event_other,
    v_tracking, v_title, btrim(p_requested_by),
    nullif(btrim(coalesce(p_notes, '')), ''), v_starts_at, v_ends_at
  )
  RETURNING id INTO v_booking_id;

  BEGIN
    INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, slot_start, slot_end)
    SELECT v_booking_id, p_venue_id, slot, slot + interval '30 minutes'
    FROM unnest(v_slots) AS slot;
  EXCEPTION WHEN unique_violation THEN
    -- Two submitters raced for the same slot. The loser is told to pick again
    -- rather than shown a constraint name.
    RAISE EXCEPTION 'Someone just booked one of those times. Please pick another slot.'
      USING ERRCODE = 'unique_violation';
  END;

  RETURN jsonb_build_object(
    'id',            v_booking_id,
    'tracking_code', v_tracking,
    'title',         v_title,
    'starts_at',     v_starts_at,
    'ends_at',       v_ends_at
  );
END;
$$;

-- ── 4. Row level security ─────────────────────────────────────
-- Identical to venues: the console manages the list, the public flow only
-- ever reads it through the SECURITY DEFINER RPC.
ALTER TABLE public.venue_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venue_events_select" ON public.venue_events;
CREATE POLICY "venue_events_select" ON public.venue_events
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_read')
  );

DROP POLICY IF EXISTS "venue_events_insert" ON public.venue_events;
CREATE POLICY "venue_events_insert" ON public.venue_events
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_create')
  );

DROP POLICY IF EXISTS "venue_events_update" ON public.venue_events;
CREATE POLICY "venue_events_update" ON public.venue_events
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_update')
  );

DROP POLICY IF EXISTS "venue_events_delete" ON public.venue_events;
CREATE POLICY "venue_events_delete" ON public.venue_events
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can(workspace_id, 'can_delete')
  );

-- ── 5. Data API grants ────────────────────────────────────────
-- Default privileges are revoked workspace-wide (see
-- 20260904160000_venue_booking_data_api_grants), so a new table starts with
-- none and PostgREST would answer 42501 before RLS is ever consulted.
REVOKE ALL ON TABLE public.venue_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venue_events TO authenticated;
GRANT ALL ON TABLE public.venue_events TO service_role;

-- ── 6. Execution grants ───────────────────────────────────────
REVOKE ALL ON FUNCTION public.public_list_venue_events(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_submit_venue_booking(
  uuid, uuid, text, timestamptz[], uuid, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_list_venue_events(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_venue_booking(
  uuid, uuid, text, timestamptz[], uuid, text, text
) TO anon, authenticated;

COMMIT;
