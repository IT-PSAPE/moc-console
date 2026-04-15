-- ============================================================
-- Phase 13 — YouTube Streams Integration
-- Requires: Phases 1-12 (all tables, helpers, RLS, etc.)
-- ============================================================

-- ============================================================
-- Step 1: Enum
-- ============================================================

CREATE TYPE public.stream_status AS ENUM (
  'created',
  'ready',
  'live',
  'complete'
);

-- ============================================================
-- Step 2: Tables
-- ============================================================

-- youtube_connections (workspace-level OAuth credentials)
CREATE TABLE IF NOT EXISTS public.youtube_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id       text        NOT NULL,
  channel_title    text        NOT NULL,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_by     uuid        NOT NULL REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

-- streams
CREATE TABLE IF NOT EXISTS public.streams (
  id                   uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid                 NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_broadcast_id text                 NOT NULL,
  youtube_stream_id    text                 NOT NULL,
  title                text                 NOT NULL,
  description          text                 NOT NULL DEFAULT '',
  thumbnail_url        text                 NULL,
  privacy_status       text                 NOT NULL DEFAULT 'unlisted',
  is_for_kids          boolean              NOT NULL DEFAULT false,
  scheduled_start_time timestamptz          NULL,
  actual_start_time    timestamptz          NULL,
  actual_end_time      timestamptz          NULL,
  stream_status        public.stream_status NOT NULL DEFAULT 'created',
  stream_url           text                 NULL,
  stream_key           text                 NULL,
  ingestion_url        text                 NULL,
  category_id          text                 NULL,
  tags                 text[]               NOT NULL DEFAULT '{}',
  latency_preference   text                 NOT NULL DEFAULT 'normal',
  enable_dvr           boolean              NOT NULL DEFAULT true,
  enable_embed         boolean              NOT NULL DEFAULT true,
  enable_auto_start    boolean              NOT NULL DEFAULT false,
  enable_auto_stop     boolean              NOT NULL DEFAULT true,
  playlist_id          text                 NULL,
  created_by           uuid                 NOT NULL REFERENCES public.users(id),
  created_at           timestamptz          NOT NULL DEFAULT now(),
  updated_at           timestamptz          NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_broadcast_id)
);

-- ============================================================
-- Step 3: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_youtube_connections_workspace_id
  ON public.youtube_connections (workspace_id);

CREATE INDEX IF NOT EXISTS idx_streams_workspace_id
  ON public.streams (workspace_id);

CREATE INDEX IF NOT EXISTS idx_streams_status
  ON public.streams (stream_status);

-- ============================================================
-- Step 4: Triggers (reuse existing set_updated_at function)
-- ============================================================

CREATE TRIGGER set_youtube_connections_updated_at
  BEFORE UPDATE ON public.youtube_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_streams_updated_at
  BEFORE UPDATE ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Step 5: RLS
-- ============================================================

ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

-- youtube_connections (admin-only for writes) -----------------

DROP POLICY IF EXISTS "youtube_connections_select" ON public.youtube_connections;
CREATE POLICY "youtube_connections_select" ON public.youtube_connections
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "youtube_connections_insert" ON public.youtube_connections;
CREATE POLICY "youtube_connections_insert" ON public.youtube_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

-- UPDATE allows can_update (editors) so they can refresh expired tokens during API calls
DROP POLICY IF EXISTS "youtube_connections_update" ON public.youtube_connections;
CREATE POLICY "youtube_connections_update" ON public.youtube_connections
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "youtube_connections_delete" ON public.youtube_connections;
CREATE POLICY "youtube_connections_delete" ON public.youtube_connections
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

-- streams (standard CRUD pattern) ----------------------------

DROP POLICY IF EXISTS "streams_select" ON public.streams;
CREATE POLICY "streams_select" ON public.streams
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "streams_insert" ON public.streams;
CREATE POLICY "streams_insert" ON public.streams
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "streams_update" ON public.streams;
CREATE POLICY "streams_update" ON public.streams
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "streams_delete" ON public.streams;
CREATE POLICY "streams_delete" ON public.streams
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );
