-- ============================================================
-- Phase 18 — Event Timeline Sharing + Live Playback Sync
-- Requires: Phase 4 (events/tracks/cues), Phase 8 (private helpers),
--           Phase 9 (RLS pattern)
-- ============================================================
-- Implements GitHub issue #18:
--   * event_shares      — token-based public share links per event
--   * event_playback_state — last-known playhead state per event
--   * RPC get_shared_event_view(p_token) — anon read of event + tracks +
--     cues + playback state via SECURITY DEFINER, gated by token
--   * RPC update_event_playback(...) — workspace controller writes
--     playback state (also broadcasts via Realtime if subscribed)
-- ============================================================

-- ─── event_shares ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_shares (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  share_token        text        NOT NULL UNIQUE,
  is_active          boolean     NOT NULL DEFAULT true,
  live_sync_enabled  boolean     NOT NULL DEFAULT true,
  created_by         uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NULL
);

-- One active share per event (allow historical inactive rows)
CREATE UNIQUE INDEX IF NOT EXISTS event_shares_one_active_per_event_idx
  ON public.event_shares(event_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS event_shares_event_id_idx ON public.event_shares(event_id);

CREATE OR REPLACE FUNCTION public.set_event_shares_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_shares_set_updated_at ON public.event_shares;
CREATE TRIGGER event_shares_set_updated_at
  BEFORE UPDATE ON public.event_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_event_shares_updated_at();

-- ─── event_playback_state ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_playback_state (
  event_id          uuid        PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  current_time_min  numeric     NOT NULL DEFAULT 0,
  is_playing        boolean     NOT NULL DEFAULT false,
  playback_speed    numeric     NOT NULL DEFAULT 1,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS event_playback_state_updated_at_idx
  ON public.event_playback_state(updated_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.event_shares          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_playback_state  ENABLE ROW LEVEL SECURITY;

-- event_shares: workspace members can read/write their own events' shares
DROP POLICY IF EXISTS "event_shares_select" ON public.event_shares;
CREATE POLICY "event_shares_select" ON public.event_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "event_shares_insert" ON public.event_shares;
CREATE POLICY "event_shares_insert" ON public.event_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_shares_update" ON public.event_shares;
CREATE POLICY "event_shares_update" ON public.event_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_shares_delete" ON public.event_shares;
CREATE POLICY "event_shares_delete" ON public.event_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

-- event_playback_state: workspace members read+write
DROP POLICY IF EXISTS "event_playback_state_select" ON public.event_playback_state;
CREATE POLICY "event_playback_state_select" ON public.event_playback_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "event_playback_state_insert" ON public.event_playback_state;
CREATE POLICY "event_playback_state_insert" ON public.event_playback_state
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_playback_state_update" ON public.event_playback_state;
CREATE POLICY "event_playback_state_update" ON public.event_playback_state
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

-- ─── RPCs ────────────────────────────────────────────────────

-- Resolve a share token to an event view (event + tracks + cues + last
-- known playback state). SECURITY DEFINER lets anon clients use this
-- without needing direct RLS access to the underlying tables.
CREATE OR REPLACE FUNCTION public.get_shared_event_view(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share        public.event_shares%ROWTYPE;
  v_event_row    public.events%ROWTYPE;
  v_tracks       jsonb;
  v_playback     jsonb;
BEGIN
  SELECT * INTO v_share
  FROM public.event_shares
  WHERE share_token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_share.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_event_row
  FROM public.events
  WHERE id = v_share.event_id;

  IF v_event_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(track ORDER BY track->>'sort_order'), '[]'::jsonb) INTO v_tracks
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'sort_order', t.sort_order,
      'color_key', c.key,
      'cues', coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', cue.id,
              'label', cue.label,
              'start', cue.start,
              'duration', cue.duration,
              'type', cue.type,
              'assignee', cue.assignee,
              'notes', cue.notes
            )
            ORDER BY cue.start
          )
          FROM public.cues cue
          WHERE cue.track_id = t.id
        ),
        '[]'::jsonb
      )
    ) AS track
    FROM public.tracks t
    LEFT JOIN public.colors c ON c.id = t.color_id
    WHERE t.event_id = v_share.event_id
  ) sub;

  SELECT to_jsonb(eps) INTO v_playback
  FROM public.event_playback_state eps
  WHERE eps.event_id = v_share.event_id;

  RETURN jsonb_build_object(
    'share', jsonb_build_object(
      'token', v_share.share_token,
      'live_sync_enabled', v_share.live_sync_enabled,
      'expires_at', v_share.expires_at
    ),
    'event', jsonb_build_object(
      'id', v_event_row.id,
      'title', v_event_row.title,
      'description', v_event_row.description,
      'duration', v_event_row.duration,
      'scheduled_at', v_event_row.scheduled_at
    ),
    'tracks', v_tracks,
    'playback', coalesce(v_playback, jsonb_build_object(
      'event_id', v_share.event_id,
      'current_time_min', 0,
      'is_playing', false,
      'playback_speed', 1,
      'updated_at', null
    ))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_event_view(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_event_view(text) TO anon, authenticated;

-- Upsert event playback state. Caller must be a workspace member with
-- can_update. Returns the saved row.
CREATE OR REPLACE FUNCTION public.upsert_event_playback_state(
  p_event_id uuid,
  p_current_time_min numeric,
  p_is_playing boolean,
  p_playback_speed numeric DEFAULT 1
)
RETURNS public.event_playback_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_row public.event_playback_state;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  IF NOT private.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF NOT private.current_user_can('can_update') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  INSERT INTO public.event_playback_state(
    event_id, current_time_min, is_playing, playback_speed, updated_at, updated_by
  )
  VALUES (
    p_event_id, p_current_time_min, p_is_playing, coalesce(p_playback_speed, 1), now(), auth.uid()
  )
  ON CONFLICT (event_id) DO UPDATE SET
    current_time_min = EXCLUDED.current_time_min,
    is_playing       = EXCLUDED.is_playing,
    playback_speed   = EXCLUDED.playback_speed,
    updated_at       = now(),
    updated_by       = auth.uid()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_event_playback_state(uuid, numeric, boolean, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_event_playback_state(uuid, numeric, boolean, numeric) TO authenticated;
