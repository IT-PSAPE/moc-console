-- ============================================================
-- patch 2026-06-16b — weekly archive + stale-item notifications
-- ============================================================
-- Run AFTER 2026-06-16a (which commits the 'archived' booking_status
-- value this patch references).
--
-- Adds:
--   1. bookings.updated_at (+ stamper trigger) and bookings.stale_notified_at
--   2. requests.stale_notified_at
--   3. notification_settings — per-workspace stale threshold (days)
--   4. notification_recipients — users who receive stale-item DMs
--   5. public_browse_equipment — exclude 'archived' bookings from availability
--   6. claim_stale_requests() / claim_stale_bookings() — atomic claim+stamp
--      RPCs used by the daily stale-items cron (per-workspace threshold)
--   7. supporting indexes
--
-- Idempotent: safe to run repeatedly. Also folded into the canonical
-- phase-01/02/03 files for fresh installs; this patch is ONLY for
-- already-provisioned databases.
-- ============================================================

-- ── 1. bookings: updated_at + stale_notified_at ──
-- Bookings had no updated_at; "not updated in N days" needs one.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stale_notified_at timestamptz NULL;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. requests: stale_notified_at ──
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS stale_notified_at timestamptz NULL;

-- ── 3. notification_settings (per-workspace stale threshold) ──
CREATE TABLE IF NOT EXISTS public.notification_settings (
  workspace_id        uuid        PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stale_threshold_days integer    NOT NULL DEFAULT 3 CHECK (stale_threshold_days > 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER set_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings_select" ON public.notification_settings;
CREATE POLICY "notification_settings_select" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_settings_insert" ON public.notification_settings;
CREATE POLICY "notification_settings_insert" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_settings_update" ON public.notification_settings;
CREATE POLICY "notification_settings_update" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_settings_delete" ON public.notification_settings;
CREATE POLICY "notification_settings_delete" ON public.notification_settings
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));

-- ── 4. notification_recipients (users who receive stale-item DMs) ──
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enabled      boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_workspace_id
  ON public.notification_recipients (workspace_id);

DROP TRIGGER IF EXISTS set_notification_recipients_updated_at ON public.notification_recipients;
CREATE TRIGGER set_notification_recipients_updated_at
  BEFORE UPDATE ON public.notification_recipients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_recipients_select" ON public.notification_recipients;
CREATE POLICY "notification_recipients_select" ON public.notification_recipients
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_recipients_insert" ON public.notification_recipients;
CREATE POLICY "notification_recipients_insert" ON public.notification_recipients
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_recipients_update" ON public.notification_recipients;
CREATE POLICY "notification_recipients_update" ON public.notification_recipients
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_recipients_delete" ON public.notification_recipients;
CREATE POLICY "notification_recipients_delete" ON public.notification_recipients
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));

-- ── 5. public_browse_equipment — archived bookings must not block availability ──
-- Only change vs the canonical version: `b.status <> 'returned'` becomes
-- `b.status NOT IN ('returned','archived')` in BOTH the is_available
-- subquery and the ORDER BY subquery.
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

-- ── 6. Stale-claim RPCs (atomic claim + stamp; per-workspace threshold) ──
-- Each selects items past their workspace threshold (default 3 days)
-- that haven't been alerted within one threshold window, stamps
-- stale_notified_at = now(), and returns the claimed rows. Atomic so a
-- retried cron run never double-sends. Called by the service role.
CREATE OR REPLACE FUNCTION public.claim_stale_requests()
RETURNS SETOF public.requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.requests r
  SET stale_notified_at = now()
  WHERE r.id IN (
    SELECT r2.id
    FROM public.requests r2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = r2.workspace_id
    WHERE r2.status NOT IN ('archived', 'completed')
      AND r2.updated_at < now() - make_interval(days => coalesce(ns.stale_threshold_days, 3))
      AND (
        r2.stale_notified_at IS NULL
        OR r2.stale_notified_at < now() - make_interval(days => coalesce(ns.stale_threshold_days, 3))
      )
  )
  RETURNING r.*;
$$;

CREATE OR REPLACE FUNCTION public.claim_stale_bookings()
RETURNS SETOF public.bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bookings b
  SET stale_notified_at = now()
  WHERE b.id IN (
    SELECT b2.id
    FROM public.bookings b2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = b2.workspace_id
    WHERE b2.status NOT IN ('returned', 'archived')
      AND (
        b2.updated_at < now() - make_interval(days => coalesce(ns.stale_threshold_days, 3))
        OR (b2.expected_return_at < now() AND b2.returned_at IS NULL)
      )
      AND (
        b2.stale_notified_at IS NULL
        OR b2.stale_notified_at < now() - make_interval(days => coalesce(ns.stale_threshold_days, 3))
      )
  )
  RETURNING b.*;
$$;

GRANT EXECUTE ON FUNCTION public.claim_stale_requests() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stale_bookings() TO service_role, authenticated;

-- ── 7. Indexes supporting the daily stale sweep ──
CREATE INDEX IF NOT EXISTS idx_requests_updated_at ON public.requests (updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings (updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_expected_return
  ON public.bookings (expected_return_at) WHERE returned_at IS NULL;
