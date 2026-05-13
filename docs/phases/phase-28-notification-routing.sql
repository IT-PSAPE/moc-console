-- ============================================================
-- Phase 28 — Notification Routing (Telegram groups & topics)
-- Requires: Phase 02 (workspaces), Phase 08 (private helpers),
--           Phase 13 (streams, zoom_meetings), Phase 21+23 (telegram_groups)
-- ============================================================
-- Lets workspace admins map app event types (e.g. stream.created,
-- request.status_changed) to one or more Telegram destinations
-- (a group, optionally a forum topic within that group).
--
-- The dispatcher (server/notifications/dispatch.ts) reads enabled
-- rows for a given (workspace_id, event_type) and fans out a
-- formatted message to each destination. Failures are logged into
-- bug_reports.
--
-- Stream / Zoom dedupe: notified_at is stamped the first time a
-- row is sent. Subsequent updates or sync passes never re-fire.
-- ============================================================

-- ------------------------------------------------------------
-- Step 1: notified_at on streams + zoom_meetings (dedupe)
-- ------------------------------------------------------------

ALTER TABLE public.streams
  ADD COLUMN IF NOT EXISTS notified_at timestamptz NULL;

ALTER TABLE public.zoom_meetings
  ADD COLUMN IF NOT EXISTS notified_at timestamptz NULL;

-- ------------------------------------------------------------
-- Step 2: notification_routes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_routes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  group_chat_id text        NOT NULL REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id     bigint      NULL,
  enabled       boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Two partial unique indexes so the same destination can't be configured
-- twice for the same event. Split because NULLs are never equal in a plain
-- UNIQUE constraint (which would allow duplicate "no topic" rows).
CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_unique_with_topic
  ON public.notification_routes (workspace_id, event_type, group_chat_id, thread_id)
  WHERE thread_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_unique_no_topic
  ON public.notification_routes (workspace_id, event_type, group_chat_id)
  WHERE thread_id IS NULL;

CREATE INDEX IF NOT EXISTS notification_routes_lookup_idx
  ON public.notification_routes (workspace_id, event_type) WHERE enabled = true;

CREATE TRIGGER set_notification_routes_updated_at
  BEFORE UPDATE ON public.notification_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- Step 3: RLS — workspace members can read; admins manage
-- ------------------------------------------------------------

ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_routes_select" ON public.notification_routes;
CREATE POLICY "notification_routes_select" ON public.notification_routes
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_routes_insert" ON public.notification_routes;
CREATE POLICY "notification_routes_insert" ON public.notification_routes
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_routes_update" ON public.notification_routes;
CREATE POLICY "notification_routes_update" ON public.notification_routes
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_routes_delete" ON public.notification_routes;
CREATE POLICY "notification_routes_delete" ON public.notification_routes
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));
