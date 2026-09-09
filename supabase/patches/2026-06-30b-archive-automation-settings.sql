-- ============================================================
-- patch 2026-06-30b — workspace archive automation settings
-- ============================================================
-- Adds per-workspace controls for the weekly archive sweep:
--   auto_archive_completed_requests_days — completed requests archive
--     after this many days. Default 7.
--   auto_archive_returned_bookings_days — returned equipment bookings
--     archive after this many days. Default 7.
--
-- The weekly archive cron now calls archive_completed_requests() and
-- archive_returned_bookings(); both RPCs apply each workspace's delay
-- and are idempotent. No RLS change — the new columns inherit
-- notification_settings' existing workspace-scoped policies.
--
-- Also folded into canonical phase-01-schema.sql and phase-02-logic.sql
-- for fresh installs; this patch is ONLY for already-provisioned DBs.
-- ============================================================

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS auto_archive_completed_requests_days integer NOT NULL DEFAULT 7
  CHECK (auto_archive_completed_requests_days > 0);

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS auto_archive_returned_bookings_days integer NOT NULL DEFAULT 7
  CHECK (auto_archive_returned_bookings_days > 0);

CREATE OR REPLACE FUNCTION public.archive_completed_requests()
RETURNS SETOF public.requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.requests r
  SET status = 'archived',
      updated_at = now()
  WHERE r.id IN (
    SELECT r2.id
    FROM public.requests r2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = r2.workspace_id
    WHERE r2.status = 'completed'
      AND r2.updated_at < now() - make_interval(days => coalesce(ns.auto_archive_completed_requests_days, 7))
  )
  RETURNING r.*;
$$;

CREATE OR REPLACE FUNCTION public.archive_returned_bookings()
RETURNS SETOF public.bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bookings b
  SET status = 'archived',
      updated_at = now()
  WHERE b.id IN (
    SELECT b2.id
    FROM public.bookings b2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = b2.workspace_id
    WHERE b2.status = 'returned'
      AND coalesce(b2.returned_at, b2.updated_at) < now() - make_interval(days => coalesce(ns.auto_archive_returned_bookings_days, 7))
  )
  RETURNING b.*;
$$;

GRANT EXECUTE ON FUNCTION public.archive_completed_requests() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_returned_bookings() TO service_role, authenticated;
