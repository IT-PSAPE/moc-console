-- ============================================================
-- patch 2026-06-30 — Telegram message date-format settings
-- ============================================================
-- Per-workspace control over how dates render in Telegram notifications
-- (group posts, assignment DMs, stale-item alerts). Previously every
-- date was emitted in UTC via toUTCString() — e.g.
-- "Wed, 21 May 2026 17:00:00 GMT". The dispatcher now localises each date
-- to the workspace's zone using a named format preset.
--
-- Adds to notification_settings:
--   timezone     — IANA zone name. Default 'Africa/Harare' (CAT, GMT+2).
--   date_format  — preset key, one of:
--                    'day-month-time'        → 21 May, 7:00 PM   (default)
--                    'day-month-year-time'   → 21 May 2026, 7:00 PM
--                    'weekday-24h'           → Thu, 21 May 2026, 19:00
--
-- No RLS change — the new columns inherit notification_settings' existing
-- workspace-scoped policies. Idempotent: safe to run repeatedly. Also
-- folded into the canonical phase-01-schema.sql for fresh installs; this
-- patch is ONLY for already-provisioned databases.
-- ============================================================

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Harare';

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'day-month-time';
