-- ============================================================
-- Phase 23 — Workspace scoping for Telegram groups
-- Requires: Phase 02 (workspaces, default seed),
--           Phase 08 (private helpers — is_workspace_member, current_user_can),
--           Phase 21 (telegram_groups, telegram_group_topics)
-- ============================================================
-- Binds telegram_groups (and, by inheritance, telegram_group_topics)
-- to a workspace. Existing rows are backfilled to the seeded
-- "default-workspace" workspace.
--
-- Registration of a chat is now explicit via /register_group <slug>
-- (or /register_topic [slug] which can bootstrap the parent group).
-- The webhook continues to use the service-role key and bypasses RLS.
-- ============================================================

ALTER TABLE public.telegram_groups
  ADD COLUMN IF NOT EXISTS workspace_id uuid NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.telegram_groups
SET workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'default-workspace')
WHERE workspace_id IS NULL;

ALTER TABLE public.telegram_groups
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS telegram_groups_workspace_id_idx
  ON public.telegram_groups (workspace_id);

-- Replace admin-only policies with workspace-scoped reads/updates.
DROP POLICY IF EXISTS "telegram_groups_select_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_select" ON public.telegram_groups
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "telegram_groups_update_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_update" ON public.telegram_groups
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "telegram_group_topics_select_admin" ON public.telegram_group_topics;
CREATE POLICY "telegram_group_topics_select" ON public.telegram_group_topics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.telegram_groups g
      WHERE g.chat_id = group_chat_id
        AND (
          private.is_workspace_member(g.workspace_id)
          OR private.current_user_can('can_manage_roles')
        )
    )
  );
