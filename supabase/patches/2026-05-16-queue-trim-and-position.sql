-- ============================================================
-- patch 2026-05-16 — queue trim + free position
-- ============================================================
-- Adds per-clip timeline position and non-destructive trim:
--   start_sec  — explicit timeline position in seconds. NULL keeps the
--                legacy gapless behaviour (append after previous clip).
--                Set once a clip is dragged; lets clips sit with
--                deliberate gaps (gap = black on the public screen).
--   in_point   — seconds into the SOURCE a video/audio clip starts at.
--   out_point  — seconds into the SOURCE it ends at (NULL = source end).
--   muted      — per-clip video audio (default off: videos play sound).
--
-- Also redeploys save_playlist_lanes() so the RPC persists these new
-- fields. Idempotent: safe to re-run on a live database. The columns
-- are folded into phase-01-schema.sql / the function into
-- phase-02-logic.sql for fresh installs; this patch is ONLY for
-- already-provisioned databases. Existing rows keep in_point=0 /
-- out_point=NULL / start_sec=NULL, i.e. unchanged playback.
-- ============================================================

ALTER TABLE public.queue
  ADD COLUMN IF NOT EXISTS start_sec numeric NULL,
  ADD COLUMN IF NOT EXISTS in_point  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS out_point numeric NULL,
  ADD COLUMN IF NOT EXISTS muted     boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.save_playlist_lanes(
  p_playlist_id uuid,
  p_lanes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lane jsonb;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.playlists WHERE id = p_playlist_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Playlist % not found', p_playlist_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT private.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized for this workspace'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.current_user_can('can_update') THEN
    RAISE EXCEPTION 'Not authorized to update playlists'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_playlist_id::text, 0));

  DELETE FROM public.playlist_lanes WHERE playlist_id = p_playlist_id;

  FOR v_lane IN
    SELECT * FROM jsonb_array_elements(coalesce(p_lanes, '[]'::jsonb))
  LOOP
    INSERT INTO public.playlist_lanes (id, playlist_id, sort_order, type, name)
    VALUES (
      (v_lane->>'id')::uuid,
      p_playlist_id,
      (v_lane->>'sort_order')::integer,
      coalesce(v_lane->>'type', 'visual'),
      v_lane->>'name'
    );

    INSERT INTO public.queue (id, playlist_id, lane_id, media_id, sort_order, duration, start_sec, in_point, out_point, muted, disabled)
    SELECT
      cue.id,
      p_playlist_id,
      (v_lane->>'id')::uuid,
      cue.media_id,
      cue.sort_order,
      cue.duration,
      cue.start_sec,
      coalesce(cue.in_point, 0),
      cue.out_point,
      coalesce(cue.muted, false),
      cue.disabled
    FROM jsonb_to_recordset(coalesce(v_lane->'cues', '[]'::jsonb)) AS cue(
      id uuid,
      media_id uuid,
      sort_order integer,
      duration integer,
      start_sec numeric,
      in_point numeric,
      out_point numeric,
      muted boolean,
      disabled boolean
    );
  END LOOP;
END;
$$;
