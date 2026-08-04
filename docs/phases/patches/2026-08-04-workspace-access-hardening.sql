-- 2026-08-04 — Workspace-scoped authorization and approval-only signup.
--
-- Run after every earlier phase and patch. This migration intentionally keeps
-- public.user_roles as a read-only legacy table during rollout; authorization
-- is sourced exclusively from workspace_users.role_id after this patch.

BEGIN;

-- Every accepted membership owns its role. Existing global roles are copied
-- onto each of the user's current memberships before the column becomes
-- required.
ALTER TABLE public.workspace_users
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE RESTRICT;

UPDATE public.workspace_users AS membership
SET role_id = legacy.role_id
FROM public.user_roles AS legacy
WHERE legacy.user_id = membership.user_id
  AND membership.role_id IS NULL;

UPDATE public.workspace_users AS membership
SET role_id = viewer.id
FROM public.roles AS viewer
WHERE viewer.name = 'viewer'
  AND membership.role_id IS NULL;

ALTER TABLE public.workspace_users ALTER COLUMN role_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_users_role_id ON public.workspace_users (role_id);

-- Pending access is deliberately separate from workspace_users so a pending
-- account can never satisfy an existing membership policy by accident.
CREATE TABLE IF NOT EXISTS public.workspace_join_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_join_requests_workspace_id
  ON public.workspace_join_requests (workspace_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_workspace_join_requests_user_id
  ON public.workspace_join_requests (user_id);

ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.workspace_join_requests TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_join_requests TO service_role;

-- Workspace-aware permission helpers. The one-argument overload remains only
-- as a fail-closed compatibility path for obsolete functions: it grants a
-- permission only when every membership grants it, preventing privilege from
-- one workspace leaking into another.
CREATE OR REPLACE FUNCTION private.current_user_can(
  p_workspace_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users AS membership
    JOIN public.roles AS role ON role.id = membership.role_id
    WHERE membership.workspace_id = p_workspace_id
      AND membership.user_id = auth.uid()
      AND CASE p_permission
        WHEN 'can_create'       THEN role.can_create
        WHEN 'can_read'         THEN role.can_read
        WHEN 'can_update'       THEN role.can_update
        WHEN 'can_delete'       THEN role.can_delete
        WHEN 'can_manage_roles' THEN role.can_manage_roles
        ELSE false
      END
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_can(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(bool_and(
    CASE p_permission
      WHEN 'can_create'       THEN role.can_create
      WHEN 'can_read'         THEN role.can_read
      WHEN 'can_update'       THEN role.can_update
      WHEN 'can_delete'       THEN role.can_delete
      WHEN 'can_manage_roles' THEN role.can_manage_roles
      ELSE false
    END
  ), false)
  FROM public.workspace_users AS membership
  JOIN public.roles AS role ON role.id = membership.role_id
  WHERE membership.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.current_user_role_name(p_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role.name
  FROM public.workspace_users AS membership
  JOIN public.roles AS role ON role.id = membership.role_id
  WHERE membership.workspace_id = p_workspace_id
    AND membership.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.current_user_can(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_can(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_role_name(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_workspace_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_can(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO authenticated;

-- Signup creates the profile and a pending request, never an accepted
-- membership. raw_user_meta_data is used only as user-supplied request data,
-- not as an authorization decision.
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id uuid;
  v_chosen_slug text;
BEGIN
  v_chosen_slug := NULLIF(trim(coalesce(new.raw_user_meta_data->>'workspace_slug', '')), '');

  IF v_chosen_slug IS NOT NULL THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE slug = v_chosen_slug;
  END IF;

  IF v_workspace_id IS NULL THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE slug = 'default-workspace';
  END IF;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace available for this access request';
  END IF;

  INSERT INTO public.users (id, name, surname, email, telegram_chat_id)
  VALUES (
    new.id,
    trim(coalesce(new.raw_user_meta_data->>'name', '')),
    trim(coalesce(new.raw_user_meta_data->>'surname', '')),
    new.email,
    NULL
  );

  INSERT INTO public.workspace_join_requests (workspace_id, user_id)
  VALUES (v_workspace_id, new.id)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_created() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_workspace_join_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.workspace_join_requests%ROWTYPE;
  v_viewer_role_id uuid;
BEGIN
  SELECT * INTO v_request
  FROM public.workspace_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending access request not found';
  END IF;

  IF NOT private.current_user_can(v_request.workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_viewer_role_id
  FROM public.roles
  WHERE name = 'viewer';

  IF v_viewer_role_id IS NULL THEN
    RAISE EXCEPTION 'Viewer role is missing';
  END IF;

  INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
  VALUES (v_request.workspace_id, v_request.user_id, v_viewer_role_id)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  DELETE FROM public.workspace_join_requests WHERE id = p_request_id;
  RETURN v_request.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_workspace_member_role(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.current_user_can(p_workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  UPDATE public.workspace_users
  SET role_id = p_role_id
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace member not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_last_workspace_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_can_manage boolean;
  v_new_can_manage boolean := false;
BEGIN
  SELECT can_manage_roles INTO v_old_can_manage
  FROM public.roles
  WHERE id = OLD.role_id;

  IF TG_OP = 'UPDATE' THEN
    SELECT can_manage_roles INTO v_new_can_manage
    FROM public.roles
    WHERE id = NEW.role_id;
  END IF;

  IF coalesce(v_old_can_manage, false)
    AND NOT coalesce(v_new_can_manage, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.workspace_users AS other_membership
      JOIN public.roles AS other_role ON other_role.id = other_membership.role_id
      WHERE other_membership.workspace_id = OLD.workspace_id
        AND other_membership.user_id <> OLD.user_id
        AND other_role.can_manage_roles
    )
  THEN
    RAISE EXCEPTION 'A workspace must retain at least one role manager';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_users_protect_last_manager ON public.workspace_users;
CREATE TRIGGER workspace_users_protect_last_manager
  BEFORE UPDATE OF role_id OR DELETE ON public.workspace_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_workspace_manager();

REVOKE ALL ON FUNCTION public.approve_workspace_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_workspace_member_role(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_last_workspace_manager() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_workspace_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_workspace_member_role(uuid, uuid, uuid) TO authenticated;

-- Legacy global assignments are no longer an authorization source.
DROP TRIGGER IF EXISTS user_roles_prevent_ambiguous_global_mutation ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
REVOKE ALL ON public.user_roles FROM anon, authenticated;

-- Membership, profile and pending-request policies.
DROP POLICY IF EXISTS "workspace_join_requests_select" ON public.workspace_join_requests;
CREATE POLICY "workspace_join_requests_select" ON public.workspace_join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_user_can(workspace_id, 'can_manage_roles')
  );

DROP POLICY IF EXISTS "workspace_users_select" ON public.workspace_users;
CREATE POLICY "workspace_users_select" ON public.workspace_users
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_update" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users;
CREATE POLICY "workspace_users_delete" ON public.workspace_users
  FOR DELETE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_users AS target_membership
      WHERE target_membership.user_id = users.id
        AND private.is_workspace_member(target_membership.workspace_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspace_join_requests AS pending
      WHERE pending.user_id = users.id
        AND private.current_user_can(pending.workspace_id, 'can_manage_roles')
    )
  );

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (private.current_user_can(id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(id, 'can_manage_roles'));

-- Bug reports have no workspace_id. Managers may see/update a report only if
-- they share at least one accepted workspace with its author.
DROP POLICY IF EXISTS "bug_reports_select" ON public.bug_reports;
CREATE POLICY "bug_reports_select" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_users AS author_membership
      WHERE author_membership.user_id = bug_reports.user_id
        AND private.current_user_can(author_membership.workspace_id, 'can_manage_roles')
    )
  );

DROP POLICY IF EXISTS "bug_reports_update" ON public.bug_reports;
CREATE POLICY "bug_reports_update" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_users AS author_membership
      WHERE author_membership.user_id = bug_reports.user_id
        AND private.current_user_can(author_membership.workspace_id, 'can_manage_roles')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_users AS author_membership
      WHERE author_membership.user_id = bug_reports.user_id
        AND private.current_user_can(author_membership.workspace_id, 'can_manage_roles')
    )
  );

-- Rewrite conventional policies that pair is_workspace_member(workspace) with
-- the legacy one-argument permission helper. The permission check is moved
-- beside that exact workspace expression. Exceptional OR policies are replaced
-- explicitly below.
CREATE OR REPLACE FUNCTION private.scope_policy_expression(p_expression text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_permission text;
  v_result text;
BEGIN
  v_permission := substring(
    p_expression
    FROM 'private\.current_user_can\(''(can_[a-z_]+)''::text\)'
  );

  IF v_permission IS NULL OR p_expression !~ 'private\.is_workspace_member\(' THEN
    RAISE EXCEPTION 'Cannot workspace-scope policy expression: %', p_expression;
  END IF;

  v_result := regexp_replace(
    p_expression,
    'private\.is_workspace_member\(([^()]*)\)',
    format(
      '(private.is_workspace_member(\1) AND private.current_user_can(\1, %L::text))',
      v_permission
    ),
    'g'
  );

  RETURN regexp_replace(
    v_result,
    '\s+AND\s+private\.current_user_can\(''' || v_permission || '''::text\)',
    '',
    'g'
  );
END;
$$;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        'bug_reports',
        'notification_message_templates',
        'notification_recipients',
        'notification_routes',
        'notification_settings',
        'telegram_group_topics',
        'telegram_groups',
        'user_roles',
        'users',
        'workspace_users',
        'workspaces'
      )
      AND (
        coalesce(qual, '') ~ 'AND\s+private\.current_user_can\(''(can_[a-z_]+)''::text\)'
        OR coalesce(with_check, '') ~ 'AND\s+private\.current_user_can\(''(can_[a-z_]+)''::text\)'
      )
  LOOP
    IF policy_row.qual IS NOT NULL AND policy_row.qual ~ 'private\.current_user_can\(''(can_[a-z_]+)''::text\)' THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        private.scope_policy_expression(policy_row.qual)
      );
    END IF;

    IF policy_row.with_check IS NOT NULL AND policy_row.with_check ~ 'private\.current_user_can\(''(can_[a-z_]+)''::text\)' THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        private.scope_policy_expression(policy_row.with_check)
      );
    END IF;
  END LOOP;
END;
$$;

DROP FUNCTION private.scope_policy_expression(text);

-- Workspace-specific settings and integration policies that previously used
-- an OR/global-manager shortcut.
DROP POLICY IF EXISTS "notification_settings_select" ON public.notification_settings;
CREATE POLICY "notification_settings_select" ON public.notification_settings
  FOR SELECT TO authenticated USING (private.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "notification_settings_insert" ON public.notification_settings;
CREATE POLICY "notification_settings_insert" ON public.notification_settings
  FOR INSERT TO authenticated WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_settings_update" ON public.notification_settings;
CREATE POLICY "notification_settings_update" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_settings_delete" ON public.notification_settings;
CREATE POLICY "notification_settings_delete" ON public.notification_settings
  FOR DELETE TO authenticated USING (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "notification_recipients_select" ON public.notification_recipients;
CREATE POLICY "notification_recipients_select" ON public.notification_recipients
  FOR SELECT TO authenticated USING (private.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "notification_recipients_insert" ON public.notification_recipients;
CREATE POLICY "notification_recipients_insert" ON public.notification_recipients
  FOR INSERT TO authenticated WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_recipients_update" ON public.notification_recipients;
CREATE POLICY "notification_recipients_update" ON public.notification_recipients
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_recipients_delete" ON public.notification_recipients;
CREATE POLICY "notification_recipients_delete" ON public.notification_recipients
  FOR DELETE TO authenticated USING (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "notification_routes_select" ON public.notification_routes;
CREATE POLICY "notification_routes_select" ON public.notification_routes
  FOR SELECT TO authenticated USING (private.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "notification_routes_insert" ON public.notification_routes;
CREATE POLICY "notification_routes_insert" ON public.notification_routes
  FOR INSERT TO authenticated WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_routes_update" ON public.notification_routes;
CREATE POLICY "notification_routes_update" ON public.notification_routes
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_routes_delete" ON public.notification_routes;
CREATE POLICY "notification_routes_delete" ON public.notification_routes
  FOR DELETE TO authenticated USING (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "notification_message_templates_select" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_select" ON public.notification_message_templates
  FOR SELECT TO authenticated USING (private.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "notification_message_templates_insert" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_insert" ON public.notification_message_templates
  FOR INSERT TO authenticated WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_message_templates_update" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_update" ON public.notification_message_templates
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));
DROP POLICY IF EXISTS "notification_message_templates_delete" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_delete" ON public.notification_message_templates
  FOR DELETE TO authenticated USING (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "telegram_groups_select" ON public.telegram_groups;
DROP POLICY IF EXISTS "telegram_groups_select_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_select" ON public.telegram_groups
  FOR SELECT TO authenticated USING (private.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "telegram_groups_update" ON public.telegram_groups;
DROP POLICY IF EXISTS "telegram_groups_update_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_update" ON public.telegram_groups
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_manage_roles'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_manage_roles'));

DROP POLICY IF EXISTS "telegram_group_topics_select" ON public.telegram_group_topics;
DROP POLICY IF EXISTS "telegram_group_topics_select_admin" ON public.telegram_group_topics;
CREATE POLICY "telegram_group_topics_select" ON public.telegram_group_topics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.telegram_groups AS telegram_group
      WHERE telegram_group.chat_id = telegram_group_topics.group_chat_id
        AND private.is_workspace_member(telegram_group.workspace_id)
    )
  );

-- The media bucket remains publicly readable. Accepted members can create new
-- objects only under their workspace prefix; only workspace role managers can
-- overwrite or delete them.
CREATE OR REPLACE FUNCTION private.storage_object_workspace_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_segment text;
BEGIN
  v_segment := (storage.foldername(p_name))[1];
  RETURN v_segment::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.storage_object_workspace_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.storage_object_workspace_id(text) TO authenticated;

DROP POLICY IF EXISTS "media_bucket_authenticated_insert" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND private.is_workspace_member(private.storage_object_workspace_id(name))
  );

DROP POLICY IF EXISTS "media_bucket_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "media_bucket_workspace_manager_update" ON storage.objects;
CREATE POLICY "media_bucket_workspace_manager_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_manage_roles')
  )
  WITH CHECK (
    bucket_id = 'media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_manage_roles')
  );

DROP POLICY IF EXISTS "media_bucket_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "media_bucket_workspace_manager_delete" ON storage.objects;
CREATE POLICY "media_bucket_workspace_manager_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_manage_roles')
  );

COMMIT;
