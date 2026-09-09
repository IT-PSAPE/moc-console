-- ============================================================
-- patch 2026-05-18 — youtube connection health status
-- ============================================================
-- Adds youtube_connections.status: whether the stored OAuth
-- refresh token is still usable.
--
--   'active'          — refresh token works; YouTube ops allowed.
--   'reauth_required' — Google returned invalid_grant on token
--                       refresh (refresh token expired or revoked).
--                       Set client-side when /api/youtube/oauth/refresh
--                       reports reauth_required; cleared on reconnect.
--
-- Why a column and not a timer: Google does not expose a refresh
-- token expiry (no refresh_token_expires_in), so refresh-token
-- death is only detectable reactively, on a failed refresh.
--
-- Idempotent: safe to run repeatedly on a live database. Also
-- folded into the canonical phase-01-schema.sql for fresh installs;
-- this patch is ONLY for already-provisioned databases.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.youtube_connection_status AS ENUM ('active', 'reauth_required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.youtube_connections
  ADD COLUMN IF NOT EXISTS status public.youtube_connection_status NOT NULL DEFAULT 'active';
