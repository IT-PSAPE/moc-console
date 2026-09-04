-- 2026-09-04 — Venue booking domain.
--
-- Adds a second public submission flow alongside requests and equipment
-- bookings: someone books a named venue for one continuous block of 30-minute
-- slots, giving the same 5W1H detail a request carries plus their own name.
--
-- Lifecycle (deliberately different from `bookings`):
--   Only two states are ever STORED — 'auto' and 'cancelled'. Everything a
--   reader thinks of as the status (booked → in progress → completed) is
--   DERIVED from the clock against the booked slots, by
--   public.venue_booking_phase(). Nothing has to run on a schedule for a
--   booking to become "in progress" at its start time, and a Telegram message
--   rendered an hour later reports the phase that is true when it is sent.
--   'cancelled' is the only state a human sets.
--
-- Double-booking is prevented by the database, not the UI: one row per
-- 30-minute slot with a partial unique index on (venue_id, slot_start) for
-- slots that are still active. Cancelling a booking releases its slots while
-- keeping the history of what was booked.
--
-- Also generalises notification_routes so any event can be delivered to a
-- person's Telegram DM, not only to a group or a forum topic.

BEGIN;

-- ── 1. Status domain ──────────────────────────────────────────
-- Just the two stored states. See the header: the reader-facing phase is
-- derived, so it is deliberately absent from this enum.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_booking_status') THEN
    CREATE TYPE public.venue_booking_status AS ENUM ('auto', 'cancelled');
  END IF;
END;
$$;

-- ── 2. Venues ─────────────────────────────────────────────────
-- Workspace-managed list. Venues are deactivated rather than deleted once
-- they carry bookings (venue_bookings.venue_id is ON DELETE RESTRICT), so
-- past bookings never lose the venue they were for.
CREATE TABLE IF NOT EXISTS public.venues (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  location     text        NULL,
  capacity     integer     NULL CHECK (capacity IS NULL OR capacity > 0),
  notes        text        NULL,
  active       boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venues_workspace_name_key
  ON public.venues (workspace_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_venues_workspace_id
  ON public.venues (workspace_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.venues;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Venue bookings ─────────────────────────────────────────
-- starts_at / ends_at are the derived span of the booked slots. They are
-- stored (rather than joined out of venue_booking_slots on every read) because
-- the phase derivation, the calendar, and the list ordering all need them, and
-- public_submit_venue_booking is the only writer.
CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  venue_id      uuid        NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
  tracking_code text        NOT NULL UNIQUE,
  title         text        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  requested_by  text        NOT NULL CHECK (char_length(btrim(requested_by)) > 0),
  who           text        NOT NULL,
  what          text        NOT NULL,
  when_text     text        NOT NULL,
  where_text    text        NOT NULL,
  why           text        NOT NULL,
  how           text        NOT NULL,
  notes         text        NULL,
  status        public.venue_booking_status NOT NULL DEFAULT 'auto',
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  cancelled_at  timestamptz NULL,
  cancelled_by  uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  cancel_reason text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_bookings_span_check CHECK (ends_at > starts_at),
  -- Keeps the stored state and its audit columns from drifting apart, in
  -- either direction.
  CONSTRAINT venue_bookings_cancelled_check
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_workspace_id
  ON public.venue_bookings (workspace_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue_id
  ON public.venue_bookings (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_cancelled_by
  ON public.venue_bookings (cancelled_by);
-- The list, calendar and kanban all order and window by the booked span.
CREATE INDEX IF NOT EXISTS idx_venue_bookings_workspace_starts_at
  ON public.venue_bookings (workspace_id, starts_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.venue_bookings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.venue_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. Booked slots ───────────────────────────────────────────
-- One row per 30-minute slot. venue_id and active are denormalised copies of
-- the parent's venue and cancellation state purely so a partial unique index
-- can make double-booking impossible; both are overwritten from the parent by
-- a BEFORE trigger, so neither can be set to a lie by a writer.
CREATE TABLE IF NOT EXISTS public.venue_booking_slots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_booking_id uuid        NOT NULL REFERENCES public.venue_bookings(id) ON DELETE CASCADE,
  venue_id         uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  slot_start       timestamptz NOT NULL,
  slot_end         timestamptz NOT NULL,
  active           boolean     NOT NULL DEFAULT true,
  CONSTRAINT venue_booking_slots_span_check CHECK (slot_end > slot_start)
);

-- The double-booking guard. Cancelled bookings drop out of the index, which
-- is what releases their slots back to the availability grid.
CREATE UNIQUE INDEX IF NOT EXISTS venue_booking_slots_active_key
  ON public.venue_booking_slots (venue_id, slot_start)
  WHERE active;

CREATE INDEX IF NOT EXISTS idx_venue_booking_slots_booking_id
  ON public.venue_booking_slots (venue_booking_id);

CREATE OR REPLACE FUNCTION public.enforce_venue_booking_slot_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_venue_id  uuid;
  v_cancelled boolean;
BEGIN
  SELECT venue_id, status = 'cancelled'
    INTO v_venue_id, v_cancelled
  FROM public.venue_bookings
  WHERE id = NEW.venue_booking_id;

  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Unknown venue booking' USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.venue_id := v_venue_id;
  NEW.active := NOT v_cancelled;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_booking_slots_enforce_parent ON public.venue_booking_slots;
CREATE TRIGGER venue_booking_slots_enforce_parent
  BEFORE INSERT OR UPDATE ON public.venue_booking_slots
  FOR EACH ROW EXECUTE FUNCTION public.enforce_venue_booking_slot_parent();

-- Cancelling frees the slots; un-cancelling takes them back, and fails on the
-- unique index if anyone has claimed one in the meantime. That failure is the
-- correct answer, so it is deliberately not swallowed here.
CREATE OR REPLACE FUNCTION public.sync_venue_booking_slot_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_active boolean := NEW.status <> 'cancelled';
BEGIN
  UPDATE public.venue_booking_slots
  SET active = v_active
  WHERE venue_booking_id = NEW.id
    AND active <> v_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_bookings_sync_slot_active ON public.venue_bookings;
CREATE TRIGGER venue_bookings_sync_slot_active
  AFTER UPDATE OF status ON public.venue_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_venue_booking_slot_active();

-- ── 5. The slot grid and the derived phase ────────────────────
-- The bookable day is 08:00–23:00 in the workspace's own time zone, in 30
-- minute steps: 30 slots, the last running 22:30–23:00. Both availability and
-- submission validation read the grid from this one function, so the public
-- picker cannot offer a slot the writer would reject.
CREATE OR REPLACE FUNCTION public.workspace_timezone(p_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- notification_settings.timezone is free text, and an unrecognised zone
  -- would make every availability read throw. Fall back instead.
  SELECT coalesce(
    (
      SELECT settings.timezone
      FROM public.notification_settings AS settings
      WHERE settings.workspace_id = p_workspace_id
        AND EXISTS (
          SELECT 1 FROM pg_catalog.pg_timezone_names AS zone
          WHERE zone.name = settings.timezone
        )
    ),
    'Africa/Harare'
  );
$$;

CREATE OR REPLACE FUNCTION public.venue_slot_grid(p_workspace_id uuid, p_date date)
RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH bounds AS (
    SELECT
      ((p_date + time '08:00') AT TIME ZONE zone.tz) AS day_start,
      ((p_date + time '23:00') AT TIME ZONE zone.tz) AS day_end
    FROM (SELECT public.workspace_timezone(p_workspace_id) AS tz) AS zone
  )
  SELECT step AS slot_start, step + interval '30 minutes' AS slot_end
  FROM bounds,
       generate_series(
         bounds.day_start,
         bounds.day_end - interval '30 minutes',
         interval '30 minutes'
       ) AS step;
$$;

-- The reader-facing status. Every surface — console list, calendar, kanban,
-- public tracking, Telegram — must call this rather than reinventing the
-- comparison, so they can never disagree about what a booking's state is.
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
    WHEN now() >= p_ends_at      THEN 'completed'
    WHEN now() >= p_starts_at    THEN 'in_progress'
    ELSE 'booked'
  END;
$$;

-- ── 6. Public RPCs ────────────────────────────────────────────
-- Anonymous submitters reach the venue domain only through these three
-- SECURITY DEFINER functions; the tables themselves grant nothing to anon.
CREATE OR REPLACE FUNCTION public.public_list_venues(p_workspace_id uuid)
RETURNS TABLE (
  id       uuid,
  name     text,
  location text,
  capacity integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT venue.id, venue.name, venue.location, venue.capacity
  FROM public.venues AS venue
  WHERE venue.workspace_id = p_workspace_id
    AND venue.active
  ORDER BY venue.sort_order, venue.name;
$$;

CREATE OR REPLACE FUNCTION public.public_venue_availability(
  p_workspace_id uuid,
  p_date         date,
  p_venue_id     uuid DEFAULT NULL
)
RETURNS TABLE (
  venue_id   uuid,
  venue_name text,
  slot_start timestamptz,
  slot_end   timestamptz,
  available  boolean,
  -- The zone the grid was built in. Returned so the picker labels a slot in
  -- the venue's local time rather than the visitor's: a phone set to another
  -- zone would otherwise show 16:00 for a slot that is 18:00 at the venue,
  -- and the visitor would book a time they did not mean.
  time_zone  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    venue.id,
    venue.name,
    grid.slot_start,
    grid.slot_end,
    (
      grid.slot_start > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.venue_booking_slots AS slot
        WHERE slot.venue_id = venue.id
          AND slot.slot_start = grid.slot_start
          AND slot.active
      )
    ) AS available,
    public.workspace_timezone(p_workspace_id) AS time_zone
  FROM public.venues AS venue
  CROSS JOIN public.venue_slot_grid(p_workspace_id, p_date) AS grid
  WHERE venue.workspace_id = p_workspace_id
    AND venue.active
    AND (p_venue_id IS NULL OR venue.id = p_venue_id)
  ORDER BY venue.sort_order, venue.name, grid.slot_start;
$$;

CREATE OR REPLACE FUNCTION public.public_submit_venue_booking(
  p_workspace_id uuid,
  p_venue_id     uuid,
  p_title        text,
  p_requested_by text,
  p_who          text,
  p_what         text,
  p_when_text    text,
  p_where_text   text,
  p_why          text,
  p_how          text,
  p_slot_starts  timestamptz[],
  p_notes        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_slots      timestamptz[];
  v_count      integer;
  v_zone       text;
  v_local_date date;
  v_booking_id uuid;
  v_tracking   text;
  v_starts_at  timestamptz;
  v_ends_at    timestamptz;
BEGIN
  IF nullif(btrim(p_title), '') IS NULL
    OR nullif(btrim(p_requested_by), '') IS NULL
    OR nullif(btrim(p_who), '') IS NULL
    OR nullif(btrim(p_what), '') IS NULL
    OR nullif(btrim(p_when_text), '') IS NULL
    OR nullif(btrim(p_where_text), '') IS NULL
    OR nullif(btrim(p_why), '') IS NULL
    OR nullif(btrim(p_how), '') IS NULL
  THEN
    RAISE EXCEPTION 'Fill in every required field.' USING ERRCODE = 'check_violation';
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
    workspace_id, venue_id, tracking_code, title, requested_by,
    who, what, when_text, where_text, why, how,
    notes, starts_at, ends_at
  )
  VALUES (
    p_workspace_id, p_venue_id, v_tracking, btrim(p_title), btrim(p_requested_by),
    p_who, p_what, p_when_text, p_where_text, p_why, p_how,
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
    'title',         btrim(p_title),
    'starts_at',     v_starts_at,
    'ends_at',       v_ends_at
  );
END;
$$;

-- Tracking lookup gains a third branch. Requests and equipment bookings are
-- unchanged; the venue branch reports the derived phase, not the stored state,
-- because 'auto' would mean nothing to the person tracking it.
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
    'venueLocation', venue.location,
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

-- ── 7. Row level security ─────────────────────────────────────
-- Console reads and cancels; nothing but the SECURITY DEFINER submit RPC ever
-- inserts, which is why venue_bookings has no INSERT policy at all (the
-- console never creates a submission) and the slot table has no write
-- policies.
ALTER TABLE public.venues              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_booking_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select" ON public.venues;
CREATE POLICY "venues_select" ON public.venues
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "venues_insert" ON public.venues;
CREATE POLICY "venues_insert" ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "venues_update" ON public.venues;
CREATE POLICY "venues_update" ON public.venues
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "venues_delete" ON public.venues;
CREATE POLICY "venues_delete" ON public.venues
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

DROP POLICY IF EXISTS "venue_bookings_select" ON public.venue_bookings;
CREATE POLICY "venue_bookings_select" ON public.venue_bookings
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "venue_bookings_update" ON public.venue_bookings;
CREATE POLICY "venue_bookings_update" ON public.venue_bookings
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "venue_bookings_delete" ON public.venue_bookings;
CREATE POLICY "venue_bookings_delete" ON public.venue_bookings
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

DROP POLICY IF EXISTS "venue_booking_slots_select" ON public.venue_booking_slots;
CREATE POLICY "venue_booking_slots_select" ON public.venue_booking_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_bookings AS booking
      WHERE booking.id = venue_booking_slots.venue_booking_id
        AND private.is_workspace_member(booking.workspace_id)
        AND private.current_user_can('can_read')
    )
  );

-- ── 8. Telegram notifications ─────────────────────────────────
-- notification_routes could only address a group (optionally a forum topic).
-- A route may now instead address one workspace user, delivered to their
-- linked Telegram DM. Exactly one of the two targets is set, and a DM route
-- has no thread of its own.
ALTER TABLE public.notification_routes
  ALTER COLUMN group_chat_id DROP NOT NULL;

ALTER TABLE public.notification_routes
  ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notification_routes
  DROP CONSTRAINT IF EXISTS notification_routes_single_target;
ALTER TABLE public.notification_routes
  ADD CONSTRAINT notification_routes_single_target CHECK (
    (group_chat_id IS NOT NULL AND user_id IS NULL)
    OR (group_chat_id IS NULL AND user_id IS NOT NULL AND thread_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_notification_routes_user_id
  ON public.notification_routes (user_id);

-- One route per (event, destination). Collapse any pre-existing duplicates
-- onto the oldest row first, otherwise the unique indexes cannot be built.
DELETE FROM public.notification_routes AS duplicate
WHERE duplicate.group_chat_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.notification_routes AS kept
    WHERE kept.workspace_id = duplicate.workspace_id
      AND kept.event_type = duplicate.event_type
      AND kept.group_chat_id = duplicate.group_chat_id
      AND kept.thread_id IS NOT DISTINCT FROM duplicate.thread_id
      AND (kept.created_at, kept.id) < (duplicate.created_at, duplicate.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_group_target_key
  ON public.notification_routes (workspace_id, event_type, group_chat_id, coalesce(thread_id, -1))
  WHERE group_chat_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_user_target_key
  ON public.notification_routes (workspace_id, event_type, user_id)
  WHERE user_id IS NOT NULL;

-- Two events, matching the two things that can actually happen to a booking.
-- There is deliberately no scheduled "now in progress" event: the phase is
-- derived, and the API resolves it when the message is rendered.
CREATE OR REPLACE FUNCTION public.enqueue_venue_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_type text;
  v_venue_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'venue_booking.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
    v_event_type := 'venue_booking.cancelled';
  ELSE
    RETURN NEW;
  END IF;

  SELECT name INTO v_venue_name FROM public.venues WHERE id = NEW.venue_id;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'venue_booking',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'requesterName', NEW.requested_by,
      'trackingCode', NEW.tracking_code,
      'venueName', v_venue_name,
      -- The renderer derives the phase from these at send time.
      'startsAt', NEW.starts_at,
      'endsAt', NEW.ends_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_bookings_enqueue_notification ON public.venue_bookings;
CREATE TRIGGER venue_bookings_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.venue_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_venue_booking_notification();

-- ── 9. Execution grants ───────────────────────────────────────
-- Trigger functions are never Data API RPCs.
REVOKE ALL ON FUNCTION public.enforce_venue_booking_slot_parent() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_venue_booking_slot_active() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_venue_booking_notification() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.workspace_timezone(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.venue_slot_grid(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.venue_booking_phase(public.venue_booking_status, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_list_venues(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_venue_availability(uuid, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_submit_venue_booking(
  uuid, uuid, text, text, text, text, text, text, text, text, timestamptz[], text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.venue_booking_phase(public.venue_booking_status, timestamptz, timestamptz) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.venue_slot_grid(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_timezone(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_list_venues(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_venue_availability(uuid, date, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_venue_booking(
  uuid, uuid, text, text, text, text, text, text, text, text, timestamptz[], text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO anon, authenticated;

COMMIT;
