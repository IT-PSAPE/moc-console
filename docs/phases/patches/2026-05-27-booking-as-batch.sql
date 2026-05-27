-- ============================================================
-- patch 2026-05-27 — Booking is the batch, not the per-equipment row
-- ============================================================
-- Splits public.bookings into a header (one row per submission, one
-- tracking_code, one title, one lifecycle) plus a pure-join
-- public.booking_items (one row per reserved piece of equipment).
-- See docs/adr/0006-booking-as-batch.md.
--
-- Migration steps (one transaction):
--   1. Rename existing public.bookings -> public.bookings_old (preserves data
--      until verification; dropped later in commit 6).
--   2. Drop triggers + RLS policies + indexes pointing at the legacy table.
--   3. Create new public.bookings (header) and public.booking_items (join).
--   4. Backfill bookings: one header per distinct tracking_code, title set
--      to 'Booking ' || tracking_code, status reconciled, returned_at = MAX
--      iff every item is returned, created_at = MIN(checked_out_at).
--   5. Backfill booking_items: one row per legacy bookings_old row.
--   6. Re-create triggers (sync_equipment_status now fires on booking_items
--      and on bookings UPDATE OF status; stamp_booking_returned_at and
--      set_booking_tracking_code re-attached to the new bookings table).
--   7. RLS + grants on both new tables; refresh the public RPCs to read/
--      write the new shape and accept p_title.
--
-- This patch leaves public.bookings_old in place. A follow-up
-- patch drops it once the migration has been verified in the target
-- environment.
-- ============================================================

BEGIN;

-- ── 1. Rename legacy table ────────────────────────────────────
ALTER TABLE IF EXISTS public.bookings RENAME TO bookings_old;
ALTER INDEX IF EXISTS idx_bookings_workspace_id  RENAME TO idx_bookings_old_workspace_id;
ALTER INDEX IF EXISTS idx_bookings_equipment_id  RENAME TO idx_bookings_old_equipment_id;

-- ── 2. Drop triggers + policies tied to legacy shape ──────────
DROP TRIGGER IF EXISTS sync_equipment_status        ON public.bookings_old;
DROP TRIGGER IF EXISTS stamp_booking_returned_at    ON public.bookings_old;
DROP TRIGGER IF EXISTS set_booking_tracking_code    ON public.bookings_old;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings_old;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings_old;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings_old;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings_old;

-- The legacy RPC signatures are dropped before the new functions are
-- defined so the grants attach unambiguously to the new bodies.
DROP FUNCTION IF EXISTS public.public_submit_booking_batch(uuid, uuid[], text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category);
DROP FUNCTION IF EXISTS public.public_lookup_tracking(text);

-- ── 3. New tables ─────────────────────────────────────────────
CREATE TABLE public.bookings (
  id                 uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid                  NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tracking_code      text                  NOT NULL UNIQUE,
  title              text                  NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 120),
  booked_by          text                  NOT NULL,
  checked_out_at     timestamptz           NOT NULL,
  expected_return_at timestamptz           NOT NULL,
  returned_at        timestamptz           NULL,
  notes              text                  NULL,
  status             public.booking_status NOT NULL DEFAULT 'booked',
  created_at         timestamptz           NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES public.bookings(id)  ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  UNIQUE (booking_id, equipment_id)
);

CREATE INDEX idx_bookings_workspace_id          ON public.bookings (workspace_id);
CREATE INDEX idx_bookings_tracking_code         ON public.bookings (tracking_code);
CREATE INDEX idx_booking_items_booking_id       ON public.booking_items (booking_id);
CREATE INDEX idx_booking_items_equipment_id     ON public.booking_items (equipment_id);

-- ── 4. Backfill headers from legacy data ──────────────────────
-- One header per distinct tracking_code. Status reconciled:
--   any 'checked_out' -> 'checked_out';
--   else all 'returned' -> 'returned';
--   else 'booked'.
-- returned_at = MAX(returned_at) only when every item is returned;
-- otherwise NULL (we can't claim a return time while items are still out).
-- created_at = MIN(checked_out_at) — legacy schema has no created_at column.
-- title = 'Booking ' || tracking_code (no user title existed for legacy rows).
-- workspace_id is grouped (not aggregated) because Postgres has no built-in
-- min() for uuid, and a tracking_code is generated inside a single workspace's
-- submit RPC call — every legacy row for one code shares one workspace_id by
-- construction. Including it in GROUP BY is the cleanest path; if any pre-
-- migration data anomaly somehow split a code across workspaces (impossible
-- via the RPC) the result would be one header per (code, workspace) rather
-- than a hard failure.
INSERT INTO public.bookings (
  id, workspace_id, tracking_code, title,
  booked_by, checked_out_at, expected_return_at,
  returned_at, notes, status, created_at
)
SELECT
  gen_random_uuid(),
  workspace_id,
  tracking_code,
  'Booking ' || tracking_code,
  MIN(booked_by),
  MIN(checked_out_at),
  MAX(expected_return_at),
  CASE
    WHEN bool_and(status = 'returned') THEN MAX(returned_at)
    ELSE NULL
  END,
  MIN(notes),
  CASE
    WHEN bool_or(status = 'checked_out') THEN 'checked_out'::public.booking_status
    WHEN bool_and(status = 'returned')   THEN 'returned'::public.booking_status
    ELSE 'booked'::public.booking_status
  END,
  MIN(checked_out_at)
FROM public.bookings_old
GROUP BY tracking_code, workspace_id;

-- ── 5. Backfill booking_items rows ────────────────────────────
INSERT INTO public.booking_items (booking_id, equipment_id)
SELECT b.id, o.equipment_id
FROM public.bookings_old o
JOIN public.bookings     b USING (tracking_code)
ON CONFLICT (booking_id, equipment_id) DO NOTHING;

-- ── 6. Trigger functions retargeted to new shape ──────────────
CREATE OR REPLACE FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status public.equipment_status;
  v_new_status     public.equipment_status;
BEGIN
  SELECT status INTO v_current_status
  FROM public.equipment
  WHERE id = p_equipment_id;

  IF v_current_status = 'maintenance' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'checked_out'
  ) THEN
    v_new_status := 'booked_out';
  ELSIF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'booked'
  ) THEN
    v_new_status := 'booked';
  ELSE
    v_new_status := 'available';
  END IF;

  UPDATE public.equipment
  SET status = v_new_status
  WHERE id = p_equipment_id;
END;
$$;

-- Replaces the old sync_equipment_status() that read new.equipment_id /
-- old.equipment_id directly off the bookings row. Now equipment_id lives
-- on booking_items, and lifecycle lives on bookings.
CREATE OR REPLACE FUNCTION public.sync_equipment_status_from_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_equipment_status_for(coalesce(new.equipment_id, old.equipment_id));
  RETURN coalesce(new, old);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_equipment_status_from_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_equipment_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status THEN
    RETURN new;
  END IF;

  FOR v_equipment_id IN
    SELECT equipment_id
    FROM public.booking_items
    WHERE booking_id = coalesce(new.id, old.id)
  LOOP
    PERFORM public.refresh_equipment_status_for(v_equipment_id);
  END LOOP;

  RETURN coalesce(new, old);
END;
$$;

DROP TRIGGER IF EXISTS sync_equipment_status_from_item ON public.booking_items;
CREATE TRIGGER sync_equipment_status_from_item
  AFTER INSERT OR DELETE ON public.booking_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_status_from_item();

DROP TRIGGER IF EXISTS sync_equipment_status_from_booking ON public.bookings;
CREATE TRIGGER sync_equipment_status_from_booking
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_status_from_booking();

-- stamp_booking_returned_at — header keeps the lifecycle, so this trigger
-- function is unchanged in body; just re-attach to the new bookings table.
DROP TRIGGER IF EXISTS stamp_booking_returned_at ON public.bookings;
CREATE TRIGGER stamp_booking_returned_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_booking_returned_at();

-- set_booking_tracking_code — re-attach to the new bookings header. The
-- uniqueness check in the function body now matches a real UNIQUE
-- constraint on bookings.tracking_code.
DROP TRIGGER IF EXISTS set_booking_tracking_code ON public.bookings;
CREATE TRIGGER set_booking_tracking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_tracking_code();

-- ── 7. RLS on new tables ──────────────────────────────────────
ALTER TABLE public.bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- booking_items inherits its tenancy + permission gating from its parent
-- booking; we look up the workspace via the booking row.
DROP POLICY IF EXISTS "booking_items_select" ON public.booking_items;
CREATE POLICY "booking_items_select" ON public.booking_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
        AND private.is_workspace_member(b.workspace_id)
        AND private.current_user_can('can_read')
    )
  );

DROP POLICY IF EXISTS "booking_items_insert" ON public.booking_items;
CREATE POLICY "booking_items_insert" ON public.booking_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
        AND private.is_workspace_member(b.workspace_id)
        AND private.current_user_can('can_create')
    )
  );

DROP POLICY IF EXISTS "booking_items_update" ON public.booking_items;
CREATE POLICY "booking_items_update" ON public.booking_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
        AND private.is_workspace_member(b.workspace_id)
        AND private.current_user_can('can_update')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
        AND private.is_workspace_member(b.workspace_id)
        AND private.current_user_can('can_update')
    )
  );

DROP POLICY IF EXISTS "booking_items_delete" ON public.booking_items;
CREATE POLICY "booking_items_delete" ON public.booking_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_items.booking_id
        AND private.is_workspace_member(b.workspace_id)
        AND private.current_user_can('can_delete')
    )
  );

-- ── 8. Public RPCs (rewritten for new shape) ──────────────────
CREATE OR REPLACE FUNCTION public.public_submit_booking_batch(
  p_workspace_id       uuid,
  p_title              text,
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
  v_booking_id uuid;
  v_tracking   text;
BEGIN
  v_tracking := public.generate_tracking_code('BKG');

  INSERT INTO public.bookings (
    workspace_id, tracking_code, title,
    booked_by, checked_out_at, expected_return_at, notes
  )
  VALUES (
    p_workspace_id, v_tracking, p_title,
    p_booked_by, p_checked_out_at, p_expected_return_at, p_notes
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id)
  SELECT v_booking_id, e
  FROM unnest(p_equipment_ids) AS e;

  RETURN jsonb_build_object(
    'booking_id',    v_booking_id,
    'tracking_code', v_tracking,
    'title',         p_title
  );
END;
$$;

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
      CASE
        WHEN e.status = 'maintenance' THEN false
        WHEN p_checked_out_at IS NULL OR p_expected_return_at IS NULL THEN
          e.status <> 'maintenance'
        ELSE NOT EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        )
      END AS is_available
    FROM public.equipment e
    WHERE e.workspace_id = p_workspace_id
      AND (p_search   IS NULL OR e.name ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR e.category = p_category)
    ORDER BY
      CASE
        WHEN e.status = 'maintenance' THEN 1
        WHEN p_checked_out_at IS NOT NULL AND p_expected_return_at IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        ) THEN 1
        ELSE 0
      END,
      e.name;
END;
$$;

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
  v_result jsonb;
  v_items  jsonb;
  v_code   text := upper(trim(p_tracking_code));
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

  RETURN v_result;
END;
$$;

-- ── 9. Grants for the new RPC signatures ──────────────────────
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid, text, uuid[], text, timestamptz, timestamptz, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO anon, authenticated;

-- ── 10. Refresh equipment.status for everything (best-effort) ─
-- After re-shaping the data, any equipment whose previous derived status
-- went stale gets pulled back into alignment in one pass.
DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.equipment LOOP
    PERFORM public.refresh_equipment_status_for(v_id);
  END LOOP;
END;
$$;

COMMIT;
