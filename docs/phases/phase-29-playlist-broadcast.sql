-- ============================================================
-- Phase 29 — Playlist broadcast: public playback fields + anon read
-- Requires: Phases 1-12 (playlists, queue, media, RLS, public access)
-- ============================================================
-- Backs the MOC Broadcast app (apps/broadcast): a public, no-auth
-- front-end that plays a workspace's *published* playlists.
--
-- This migration is ADDITIVE and IDEMPOTENT — safe to re-run. Before
-- applying to production, diff intent against the live Supabase schema:
-- these phase files are an intended-state snapshot, not a migration
-- ledger, so the live DB is the source of truth.
--
-- Visibility model: a playlist is publicly playable iff
-- status = 'published'. No share tokens, no separate public flag.
-- ============================================================

-- ============================================================
-- Step 1: New playback-configuration columns on playlists
-- ============================================================
-- thumbnail_url           — optional cover art (pasted URL or an
--                           upload into the existing `media` bucket).
--                           NULL → MOC Broadcast falls back to the
--                           first cue's media thumbnail.
-- playback_mode           — what happens when the playlist ends.
--                           v1 player implements 'loop' only; 'stop'
--                           and 'sequence' are modelled for later.
-- next_playlist_id        — target when playback_mode = 'sequence'.
-- transition              — cue-to-cue transition. v1 renders 'cut'
--                           only; 'fade'/'crossfade' modelled for later.
-- transition_duration_ms  — transition length for fade/crossfade.

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS thumbnail_url text NULL;

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS playback_mode text NOT NULL DEFAULT 'loop';

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS next_playlist_id uuid NULL
    REFERENCES public.playlists(id) ON DELETE SET NULL;

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS transition text NOT NULL DEFAULT 'cut';

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS transition_duration_ms integer NOT NULL DEFAULT 500;

-- CHECK constraints (guarded so re-runs don't error).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlists_playback_mode_check'
  ) THEN
    ALTER TABLE public.playlists
      ADD CONSTRAINT playlists_playback_mode_check
      CHECK (playback_mode IN ('loop', 'stop', 'sequence'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlists_transition_check'
  ) THEN
    ALTER TABLE public.playlists
      ADD CONSTRAINT playlists_transition_check
      CHECK (transition IN ('cut', 'fade', 'crossfade'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlists_transition_duration_check'
  ) THEN
    ALTER TABLE public.playlists
      ADD CONSTRAINT playlists_transition_duration_check
      CHECK (transition_duration_ms >= 0);
  END IF;
END
$$;

-- ============================================================
-- Step 2: Anonymous read access for published playlists
-- ============================================================
-- RLS is permissive (OR-combined): these anon-only SELECT policies
-- sit alongside the existing authenticated policies from phase-09
-- without weakening them. Anon can read ONLY published playlists,
-- their queue rows, and the media those rows reference.

-- 2a. playlists — anon may read published rows only.
DROP POLICY IF EXISTS "playlists_public_select" ON public.playlists;
CREATE POLICY "playlists_public_select" ON public.playlists
  FOR SELECT TO anon
  USING (status = 'published');

-- 2b. queue — anon may read rows whose parent playlist is published.
DROP POLICY IF EXISTS "queue_public_select" ON public.queue;
CREATE POLICY "queue_public_select" ON public.queue
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = queue.playlist_id
        AND p.status = 'published'
    )
  );

-- 2c. media — anon may read a media row iff it is referenced by a
--     published playlist: either as a queued cue, or as the
--     playlist's background music. A 'sequence' next playlist must
--     itself be published, so its media is covered by the same rule.
DROP POLICY IF EXISTS "media_public_select" ON public.media;
CREATE POLICY "media_public_select" ON public.media
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.queue q
      JOIN public.playlists p ON p.id = q.playlist_id
      WHERE q.media_id = media.id
        AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1
      FROM public.playlists p
      WHERE p.music_id = media.id
        AND p.status = 'published'
    )
  );

-- 2d. workspaces — MOC Broadcast lists workspaces via the existing
--     anon RPC public.list_signup_workspaces() (phase-22), which is
--     SECURITY DEFINER and already exposes only id/name/slug. We do
--     NOT add an anon RLS policy on public.workspaces here; direct
--     anon table reads stay closed. (No-op, documented intentionally.)
