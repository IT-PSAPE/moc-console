-- ============================================================
-- patch 2026-06-16a — add 'archived' to booking_status
-- ============================================================
-- Bookings gain a terminal 'archived' state (mirrors request_status,
-- which already has it). The weekly archive cron flips 'returned'
-- bookings to 'archived' so they drop out of the active equipment
-- views without being deleted.
--
-- IMPORTANT: this is in its OWN file, run BEFORE 2026-06-16b, because
-- a new enum value must be committed before any statement (RPC body,
-- UPDATE) can reference it. `ADD VALUE IF NOT EXISTS` is the idempotent
-- form (Postgres 12+); the DO/EXCEPTION pattern used for CREATE TYPE
-- does NOT work for ADD VALUE. Run this on its own, let it commit, then
-- run 2026-06-16b.
--
-- Also folded into the canonical phase-01-schema.sql for fresh installs.
-- ============================================================

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'archived';
