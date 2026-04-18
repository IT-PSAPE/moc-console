-- ============================================================
-- Phase 14 — Streams Table Patch
-- Run this on existing databases created before phase-13 was
-- updated to include the advanced stream settings columns.
-- ============================================================

ALTER TABLE public.streams
  ADD COLUMN IF NOT EXISTS category_id        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS tags               TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS latency_preference TEXT        NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS enable_dvr         BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_embed       BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_auto_start  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_auto_stop   BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS playlist_id        TEXT        NULL;
