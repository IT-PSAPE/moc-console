-- ============================================================
-- Phase 24 — Workspace update policy
-- Requires: Phase 02 (workspaces table),
--           Phase 08 (private helpers — is_workspace_member, current_user_can),
--           Phase 09 (workspaces RLS enabled, SELECT policy)
-- ============================================================
-- Allows admins (users whose role has can_manage_roles) to update
-- the name / slug / description of workspaces they belong to. The
-- table-level RLS continues to gate SELECT to members only; this
-- adds an UPDATE policy so the workspace settings UI can persist
-- changes via the standard supabase client.
-- ============================================================

DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(id)
    AND private.current_user_can('can_manage_roles')
  )
  WITH CHECK (
    private.is_workspace_member(id)
    AND private.current_user_can('can_manage_roles')
  );
