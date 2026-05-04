-- ============================================================
-- Phase 22 — Sign-up workspace selection
-- Requires: Phase 02 (workspaces, users), Phase 07 (handle_auth_user_created)
-- ============================================================
-- Lets new users pick a workspace at sign-up time instead of
-- being silently assigned to the default workspace.
--
-- 1. `public.list_signup_workspaces()` — anon-callable RPC that
--    returns id/name/slug for every workspace, used to populate
--    the workspace dropdown on the sign-up form.
-- 2. `public.handle_auth_user_created()` — updated to read
--    `workspace_slug` from auth.users.raw_user_meta_data and
--    join the user to that workspace. Falls back to
--    'default-workspace' if missing or unknown.
--
-- Run AFTER phase-07 (this replaces that trigger function).
-- ============================================================

-- ── 1. RPC: list_signup_workspaces ─────────────────────────

CREATE OR REPLACE FUNCTION public.list_signup_workspaces()
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug
  FROM public.workspaces
  ORDER BY name;
$$;

-- Anonymous (pre-signup) users need to call this. Authenticated
-- users may also call it (e.g. on the sign-up screen during a
-- pending-confirmation state).
GRANT EXECUTE ON FUNCTION public.list_signup_workspaces() TO anon, authenticated;

-- ── 2. Update auth bootstrap trigger ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id        uuid;
  v_workspace_id   uuid;
  v_chosen_slug    text;
BEGIN
  -- Look up the viewer role
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = 'viewer';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Seed role "viewer" is missing. Run seed data first.';
  END IF;

  -- Resolve the chosen workspace from sign-up metadata, if any
  v_chosen_slug := NULLIF(trim(coalesce(new.raw_user_meta_data->>'workspace_slug', '')), '');

  IF v_chosen_slug IS NOT NULL THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE slug = v_chosen_slug;
  END IF;

  -- Fallback to the seeded default workspace
  IF v_workspace_id IS NULL THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE slug = 'default-workspace';
  END IF;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No workspace available for new sign-up. Seed default-workspace first.';
  END IF;

  -- Insert the public profile row
  INSERT INTO public.users (id, name, surname, email, telegram_chat_id)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'surname', ''),
    new.email,
    NULL
  );

  -- Assign the viewer role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (new.id, v_role_id);

  -- Add to the chosen (or default) workspace
  INSERT INTO public.workspace_users (workspace_id, user_id)
  VALUES (v_workspace_id, new.id);

  RETURN new;
END;
$$;
