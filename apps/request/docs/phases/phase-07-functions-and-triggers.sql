-- ============================================================
-- Phase 7 of 10 — Functions and Triggers
-- Requires: Phases 1-6 (all tables, indexes, seed data)
-- ============================================================

-- ============================================================
-- 1. Updated-at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Apply to all tables with an updated_at column
DROP TRIGGER IF EXISTS set_updated_at ON public.workspaces;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.requests;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.event_templates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.event_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.events;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.checklist_templates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.checklists;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Auth signup bootstrap trigger
--    SECURITY DEFINER so it can bypass RLS (the user has no
--    profile or role yet when this runs).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id      uuid;
  v_workspace_id uuid;
BEGIN
  -- Look up the viewer role
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = 'viewer';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Seed role "viewer" is missing. Run seed data first.';
  END IF;

  -- Look up the default workspace
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE slug = 'default-workspace';

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Seed workspace "default-workspace" is missing. Run seed data first.';
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

  -- Add to the default workspace
  INSERT INTO public.workspace_users (workspace_id, user_id)
  VALUES (v_workspace_id, new.id);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- ============================================================
-- 3. Auth email sync trigger
--    Keeps public.users.email in sync when the auth email changes.
--    Does NOT overwrite name or surname.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF old.email IS DISTINCT FROM new.email THEN
    UPDATE public.users
    SET email = new.email
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_updated();

-- ============================================================
-- 4. Equipment status synchronization
--    Derives equipment.status from its active bookings.
--    Never overrides 'maintenance' status.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_equipment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment_id  uuid;
  v_current_status public.equipment_status;
  v_new_status     public.equipment_status;
BEGIN
  v_equipment_id := coalesce(new.equipment_id, old.equipment_id);

  -- Read current equipment status
  SELECT status INTO v_current_status
  FROM public.equipment
  WHERE id = v_equipment_id;

  -- Never override maintenance
  IF v_current_status = 'maintenance' THEN
    RETURN coalesce(new, old);
  END IF;

  -- Determine new status from active bookings
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE equipment_id = v_equipment_id AND status = 'checked_out'
  ) THEN
    v_new_status := 'booked_out';
  ELSIF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE equipment_id = v_equipment_id AND status = 'booked'
  ) THEN
    v_new_status := 'booked';
  ELSE
    v_new_status := 'available';
  END IF;

  UPDATE public.equipment
  SET status = v_new_status
  WHERE id = v_equipment_id;

  RETURN coalesce(new, old);
END;
$$;

DROP TRIGGER IF EXISTS sync_equipment_status ON public.bookings;
CREATE TRIGGER sync_equipment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_status();
