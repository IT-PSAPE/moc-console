-- ============================================================
-- Phase 16 — YouTube Connection Token Expiry Patch
-- Run this on existing databases that predate the YouTube
-- token expiry column or contain null expiry timestamps.
-- The app uses this column to show the current access-token
-- refresh window and to know when refresh/disconnect logic
-- should run.
-- ============================================================

ALTER TABLE public.youtube_connections
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

UPDATE public.youtube_connections
SET token_expires_at = now()
WHERE token_expires_at IS NULL;

ALTER TABLE public.youtube_connections
  ALTER COLUMN token_expires_at SET NOT NULL;
