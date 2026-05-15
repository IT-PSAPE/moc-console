-- ============================================================
-- Phase 8 of 10 — Private Helper Functions
-- Requires: Phases 1-7 (all tables, indexes, triggers)
-- ============================================================

-- 1. current_user_role_name()
CREATE OR REPLACE FUNCTION private.current_user_role_name()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  RETURN v_role_name;
END;
$$;

-- 2. current_user_can(p_permission text)
CREATE OR REPLACE FUNCTION private.current_user_can(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean;
BEGIN
  SELECT
    CASE p_permission
      WHEN 'can_create'       THEN r.can_create
      WHEN 'can_read'         THEN r.can_read
      WHEN 'can_update'       THEN r.can_update
      WHEN 'can_delete'       THEN r.can_delete
      WHEN 'can_manage_roles' THEN r.can_manage_roles
      ELSE false
    END
  INTO v_result
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  RETURN coalesce(v_result, false);
END;
$$;

-- 3. is_workspace_member(p_workspace_id uuid)
CREATE OR REPLACE FUNCTION private.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
END;
$$;

-- 4. promote_user_to_role(p_user_email text, p_role_name text)
--    Admin-only manual function. Not exposed to anon/authenticated.
CREATE OR REPLACE FUNCTION private.promote_user_to_role(p_user_email text, p_role_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email "%" not found.', p_user_email;
  END IF;

  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = p_role_name;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found.', p_role_name;
  END IF;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (v_user_id, v_role_id)
  ON CONFLICT (user_id)
  DO UPDATE SET role_id = EXCLUDED.role_id;
END;
$$;

-- Revoke execute from public-facing roles
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM public, anon, authenticated;

-- Re-grant execute on SECURITY DEFINER helpers that RLS policies depend on
GRANT EXECUTE ON FUNCTION private.current_user_can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role_name() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO authenticated;
