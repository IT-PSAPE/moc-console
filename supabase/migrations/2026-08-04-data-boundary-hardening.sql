-- 2026-08-04 — Harden tenant joins and OAuth credential boundaries.
--
-- This is additive and backfills existing data before removing the member-readable
-- credential columns. Run after the existing schema/patch ledger, including
-- 2026-08-04-checklist-run-request-links.sql.

BEGIN;

-- OAuth credentials belong in the non-exposed private schema. Public connection
-- rows retain only connection metadata that the console needs to display.
CREATE TABLE IF NOT EXISTS private.integration_oauth_tokens (
  provider         text        NOT NULL CHECK (provider IN ('youtube', 'zoom')),
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, workspace_id)
);

REVOKE ALL ON TABLE private.integration_oauth_tokens FROM PUBLIC, anon, authenticated;

INSERT INTO private.integration_oauth_tokens (
  provider, workspace_id, access_token, refresh_token, token_expires_at
)
SELECT 'youtube', workspace_id, access_token, refresh_token, token_expires_at
FROM public.youtube_connections
ON CONFLICT (provider, workspace_id) DO UPDATE
SET access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    updated_at = now();

INSERT INTO private.integration_oauth_tokens (
  provider, workspace_id, access_token, refresh_token, token_expires_at
)
SELECT 'zoom', workspace_id, access_token, refresh_token, token_expires_at
FROM public.zoom_connections
ON CONFLICT (provider, workspace_id) DO UPDATE
SET access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    updated_at = now();

ALTER TABLE public.youtube_connections DROP COLUMN access_token;
ALTER TABLE public.youtube_connections DROP COLUMN refresh_token;
ALTER TABLE public.zoom_connections DROP COLUMN access_token;
ALTER TABLE public.zoom_connections DROP COLUMN refresh_token;

-- Service-role-only RPCs are the bridge between the API app and private storage.
CREATE OR REPLACE FUNCTION public.get_integration_oauth_tokens(
  p_provider text,
  p_workspace_id uuid
)
RETURNS TABLE (
  access_token text,
  refresh_token text,
  token_expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT access_token, refresh_token, token_expires_at
  FROM private.integration_oauth_tokens
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id;
$$;

CREATE OR REPLACE FUNCTION public.save_integration_oauth_tokens(
  p_provider text,
  p_workspace_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  INSERT INTO private.integration_oauth_tokens (
    provider, workspace_id, access_token, refresh_token, token_expires_at
  )
  VALUES (
    p_provider, p_workspace_id, p_access_token, p_refresh_token, p_token_expires_at
  )
  ON CONFLICT (provider, workspace_id) DO UPDATE
  SET access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.delete_integration_oauth_tokens(
  p_provider text,
  p_workspace_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  DELETE FROM private.integration_oauth_tokens
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id;
$$;

REVOKE ALL ON FUNCTION public.get_integration_oauth_tokens(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_integration_oauth_tokens(text, uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_integration_oauth_tokens(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_oauth_tokens(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_integration_oauth_tokens(text, uuid, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integration_oauth_tokens(text, uuid) TO service_role;

-- Every subordinate relation must stay inside the parent workspace. These
-- trigger checks cover direct REST writes as well as the application RPCs.
CREATE OR REPLACE FUNCTION public.enforce_request_assignee_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.requests r
    JOIN public.workspace_users wu ON wu.workspace_id = r.workspace_id
    WHERE r.id = NEW.request_id
      AND wu.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Request assignee must be a member of the request workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_checklist_item_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.section_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.checklist_sections s
    WHERE s.id = NEW.section_id
      AND s.checklist_id = NEW.checklist_id
  ) THEN
    RAISE EXCEPTION 'Checklist item section must belong to the same checklist';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_template_item_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.template_section_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.template_sections s
    WHERE s.id = NEW.template_section_id
      AND s.checklist_template_id = NEW.checklist_template_id
  ) THEN
    RAISE EXCEPTION 'Template item section must belong to the same checklist template';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_checklist_assignee_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.checklist_items ci
    JOIN public.checklists c ON c.id = ci.checklist_id
    JOIN public.workspace_users wu ON wu.workspace_id = c.workspace_id
    WHERE ci.id = NEW.checklist_item_id
      AND wu.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Checklist assignee must be a member of the checklist workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_checklist_request_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = NEW.request_id
      AND r.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Checklist request must belong to the same workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_booking_item_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.equipment e ON e.workspace_id = b.workspace_id
    WHERE b.id = NEW.booking_id
      AND e.id = NEW.equipment_id
  ) THEN
    RAISE EXCEPTION 'Booking equipment must belong to the booking workspace';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS request_assignees_enforce_workspace ON public.request_assignees;
CREATE TRIGGER request_assignees_enforce_workspace
  BEFORE INSERT OR UPDATE OF request_id, user_id ON public.request_assignees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_request_assignee_workspace();

DROP TRIGGER IF EXISTS checklist_items_enforce_workspace ON public.checklist_items;
CREATE TRIGGER checklist_items_enforce_workspace
  BEFORE INSERT OR UPDATE OF checklist_id, section_id ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_item_workspace();

DROP TRIGGER IF EXISTS template_items_enforce_workspace ON public.template_items;
CREATE TRIGGER template_items_enforce_workspace
  BEFORE INSERT OR UPDATE OF checklist_template_id, template_section_id ON public.template_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_template_item_workspace();

DROP TRIGGER IF EXISTS checklist_item_assignees_enforce_workspace ON public.checklist_item_assignees;
CREATE TRIGGER checklist_item_assignees_enforce_workspace
  BEFORE INSERT OR UPDATE OF checklist_item_id, user_id ON public.checklist_item_assignees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_assignee_workspace();

DROP TRIGGER IF EXISTS checklists_enforce_request_workspace ON public.checklists;
CREATE TRIGGER checklists_enforce_request_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, request_id ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_request_workspace();

DROP TRIGGER IF EXISTS booking_items_enforce_workspace ON public.booking_items;
CREATE TRIGGER booking_items_enforce_workspace
  BEFORE INSERT OR UPDATE OF booking_id, equipment_id ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_item_workspace();

-- `user_roles` has a global primary key by design today. A role change can
-- therefore affect every workspace a person belongs to. Do not allow an
-- apparently workspace-local management action to silently do that for a
-- multi-workspace member; introduce `workspace_user_roles` in a dedicated
-- authorization migration before supporting that operation.
CREATE OR REPLACE FUNCTION public.prevent_ambiguous_global_role_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  IF (
    SELECT count(*)
    FROM public.workspace_users
    WHERE user_id = target_user_id
  ) > 1 THEN
    RAISE EXCEPTION
      'Cannot change a global role for a user in multiple workspaces; use workspace-scoped roles';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_prevent_ambiguous_global_mutation ON public.user_roles;
CREATE TRIGGER user_roles_prevent_ambiguous_global_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ambiguous_global_role_mutation();

-- The existing role is intentionally global. Guard membership writes so a
-- global role manager can administer only workspaces they actually belong to.
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      private.current_user_can('can_manage_roles')
      AND EXISTS (
        SELECT 1
        FROM public.workspace_users target_membership
        WHERE target_membership.user_id = user_roles.user_id
          AND private.is_workspace_member(target_membership.workspace_id)
      )
    )
  );

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.current_user_can('can_manage_roles')
    AND EXISTS (
      SELECT 1
      FROM public.workspace_users target_membership
      WHERE target_membership.user_id = user_roles.user_id
        AND private.is_workspace_member(target_membership.workspace_id)
    )
  );

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    private.current_user_can('can_manage_roles')
    AND EXISTS (
      SELECT 1
      FROM public.workspace_users target_membership
      WHERE target_membership.user_id = user_roles.user_id
        AND private.is_workspace_member(target_membership.workspace_id)
    )
  )
  WITH CHECK (
    private.current_user_can('can_manage_roles')
    AND EXISTS (
      SELECT 1
      FROM public.workspace_users target_membership
      WHERE target_membership.user_id = user_roles.user_id
        AND private.is_workspace_member(target_membership.workspace_id)
    )
  );

DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    private.current_user_can('can_manage_roles')
    AND EXISTS (
      SELECT 1
      FROM public.workspace_users target_membership
      WHERE target_membership.user_id = user_roles.user_id
        AND private.is_workspace_member(target_membership.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
CREATE POLICY "workspace_users_insert" ON public.workspace_users
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users;
CREATE POLICY "workspace_users_delete" ON public.workspace_users
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

COMMIT;
