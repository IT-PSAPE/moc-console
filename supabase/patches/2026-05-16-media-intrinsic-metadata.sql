-- ============================================================
-- patch 2026-05-16 — media intrinsic metadata
-- ============================================================
-- Adds intrinsic media metadata captured client-side on upload:
--   duration_seconds — video/audio length in seconds (NULL for images
--                       and for assets not yet probed/backfilled)
--   width, height    — intrinsic pixel dimensions (NULL for audio /
--                       not yet probed)
--
-- Idempotent: safe to run repeatedly on a live database. The columns
-- are also folded into the canonical phase-01-schema.sql for fresh
-- installs; this patch is ONLY for already-provisioned databases.
--
-- Existing rows stay NULL and are healed lazily: the console re-probes
-- any non-image asset with a NULL duration the next time media loads
-- and writes the measured values back.
-- ============================================================

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS duration_seconds numeric NULL,
  ADD COLUMN IF NOT EXISTS width            integer NULL,
  ADD COLUMN IF NOT EXISTS height           integer NULL;
