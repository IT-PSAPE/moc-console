CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (length(btrim(email)) BETWEEN 3 AND 254),
  normalized_email text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT workspace_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT workspace_invitations_terminal_state_check CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_pending_email_key
  ON public.workspace_invitations (workspace_id, normalized_email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS workspace_invitations_admission_idx
  ON public.workspace_invitations (normalized_email, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_list_idx
  ON public.workspace_invitations (workspace_id, created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_invitations_select ON public.workspace_invitations;
CREATE POLICY workspace_invitations_select ON public.workspace_invitations
  FOR SELECT TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS workspace_invitations_insert ON public.workspace_invitations;
CREATE POLICY workspace_invitations_insert ON public.workspace_invitations
  FOR INSERT TO moc_app WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS workspace_invitations_update ON public.workspace_invitations;
CREATE POLICY workspace_invitations_update ON public.workspace_invitations
  FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'));

GRANT SELECT, INSERT, UPDATE ON public.workspace_invitations TO moc_app;
GRANT SELECT, INSERT, UPDATE ON public.workspace_invitations TO moc_worker;
