-- ============================================================
-- patch 2026-05-17 — customizable Telegram notification templates
-- ============================================================
-- Adds notification_message_templates: per-workspace custom text for
-- Telegram notifications. One row per (workspace, scope, message_type).
--
--   scope        — 'group' (event routing) | 'dm' (assignment DMs)
--   message_type — NotificationEventKey for group scope, or
--                   'assignment.request' | 'assignment.cue' |
--                   'assignment.checklist_item' for dm scope
--   body         — the raw template string with {{token}} placeholders
--
-- Absence of a row means "use the hardcoded default", so existing
-- workspaces deliver unchanged messages. "Restore default" in the UI
-- deletes the row.
--
-- Idempotent: safe to run repeatedly on a live database. Also folded
-- into the canonical phase-01-schema.sql / phase-03-security.sql for
-- fresh installs; this patch is ONLY for already-provisioned databases.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_message_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope        text        NOT NULL,
  message_type text        NOT NULL,
  body         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_message_templates_unique
  ON public.notification_message_templates (workspace_id, scope, message_type);

ALTER TABLE public.notification_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_message_templates_select" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_select" ON public.notification_message_templates
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_message_templates_insert" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_insert" ON public.notification_message_templates
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_message_templates_update" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_update" ON public.notification_message_templates
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_message_templates_delete" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_delete" ON public.notification_message_templates
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));
