-- ============================================================
-- 02-logic.sql — Consolidated Functions, Triggers & RPCs
-- ============================================================
-- Auto-consolidated from docs/phases/phase-01..phase-31. Only the
-- FINAL resolved version of each function is emitted: phase-22's
-- handle_auth_user_created(), phase-25's upsert-by-id save_* RPCs,
-- phase-31's SECURITY DEFINER save_playlist_lanes(). The superseded
-- save_playlist_queue() RPC is intentionally NOT included.
--
-- Run order: (00-nuke optional) -> 01-schema -> 02-logic -> 03-security.
-- 01-schema's SEED block is the only data inserted.
-- ============================================================

-- ===== TRIGGER HELPER FUNCTIONS & TRIGGERS =====

-- set_updated_at() — shared updated_at stamper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

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

-- phase-13: streams / youtube_connections / zoom_* reuse set_updated_at()
DROP TRIGGER IF EXISTS set_youtube_connections_updated_at ON public.youtube_connections;
CREATE TRIGGER set_youtube_connections_updated_at
  BEFORE UPDATE ON public.youtube_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_streams_updated_at ON public.streams;
CREATE TRIGGER set_streams_updated_at
  BEFORE UPDATE ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_zoom_connections_updated_at ON public.zoom_connections;
CREATE TRIGGER set_zoom_connections_updated_at
  BEFORE UPDATE ON public.zoom_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_zoom_meetings_updated_at ON public.zoom_meetings;
CREATE TRIGGER set_zoom_meetings_updated_at
  BEFORE UPDATE ON public.zoom_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- phase-28: notification_routes reuses set_updated_at()
DROP TRIGGER IF EXISTS set_notification_routes_updated_at ON public.notification_routes;
CREATE TRIGGER set_notification_routes_updated_at
  BEFORE UPDATE ON public.notification_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- phase-17: bug_reports has its own updated_at stamper
CREATE OR REPLACE FUNCTION public.set_bug_reports_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bug_reports_set_updated_at ON public.bug_reports;
CREATE TRIGGER bug_reports_set_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_bug_reports_updated_at();

-- phase-18: event_shares has its own updated_at stamper
CREATE OR REPLACE FUNCTION public.set_event_shares_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_shares_set_updated_at ON public.event_shares;
CREATE TRIGGER event_shares_set_updated_at
  BEFORE UPDATE ON public.event_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_event_shares_updated_at();

-- phase-21: telegram_groups / telegram_group_topics updated_at stampers
CREATE OR REPLACE FUNCTION public.set_telegram_groups_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS telegram_groups_set_updated_at ON public.telegram_groups;
CREATE TRIGGER telegram_groups_set_updated_at
  BEFORE UPDATE ON public.telegram_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_groups_updated_at();

CREATE OR REPLACE FUNCTION public.set_telegram_group_topics_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS telegram_group_topics_set_updated_at ON public.telegram_group_topics;
CREATE TRIGGER telegram_group_topics_set_updated_at
  BEFORE UPDATE ON public.telegram_group_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_group_topics_updated_at();

-- ── Auth signup bootstrap (phase-22 FINAL version of phase-07's func) ──
-- SECURITY DEFINER so it can bypass RLS (the user has no profile/role yet).
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- ── Auth email sync (phase-07) ──
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

-- ── Equipment status synchronization (phase-07; reshaped 2026-05-27 — ADR-0006) ──
-- Equipment lifecycle now derives from the parent booking via booking_items:
-- the trigger fires both when an item is added/removed (membership change)
-- and when a booking's status flips (lifecycle change).
CREATE OR REPLACE FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status public.equipment_status;
  v_new_status     public.equipment_status;
BEGIN
  SELECT status INTO v_current_status
  FROM public.equipment
  WHERE id = p_equipment_id;

  IF v_current_status = 'maintenance' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'checked_out'
  ) THEN
    v_new_status := 'booked_out';
  ELSIF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'booked'
  ) THEN
    v_new_status := 'booked';
  ELSE
    v_new_status := 'available';
  END IF;

  UPDATE public.equipment
  SET status = v_new_status
  WHERE id = p_equipment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_equipment_status_from_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_equipment_status_for(coalesce(new.equipment_id, old.equipment_id));
  RETURN coalesce(new, old);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_equipment_status_from_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_equipment_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status THEN
    RETURN new;
  END IF;

  FOR v_equipment_id IN
    SELECT equipment_id
    FROM public.booking_items
    WHERE booking_id = coalesce(new.id, old.id)
  LOOP
    PERFORM public.refresh_equipment_status_for(v_equipment_id);
  END LOOP;

  RETURN coalesce(new, old);
END;
$$;

DROP TRIGGER IF EXISTS sync_equipment_status_from_item ON public.booking_items;
CREATE TRIGGER sync_equipment_status_from_item
  AFTER INSERT OR DELETE ON public.booking_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_status_from_item();

DROP TRIGGER IF EXISTS sync_equipment_status_from_booking ON public.bookings;
CREATE TRIGGER sync_equipment_status_from_booking
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_equipment_status_from_booking();

-- ── Auto-populate returned_at on booking return (phase-07) ──
CREATE OR REPLACE FUNCTION public.stamp_booking_returned_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.status = 'returned'
     AND (old.status IS DISTINCT FROM 'returned')
     AND new.returned_at IS NULL
  THEN
    new.returned_at = now();
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS stamp_booking_returned_at ON public.bookings;
CREATE TRIGGER stamp_booking_returned_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_booking_returned_at();

-- ── Tracking codes (phase-12) ──
CREATE OR REPLACE FUNCTION public.generate_tracking_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_request_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('REQ');
    v_attempts := v_attempts + 1;

    IF NOT EXISTS (SELECT 1 FROM public.requests WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique request tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('BKG');
    v_attempts := v_attempts + 1;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique booking tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS set_request_tracking_code ON public.requests;
CREATE TRIGGER set_request_tracking_code
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_tracking_code();

DROP TRIGGER IF EXISTS set_booking_tracking_code ON public.bookings;
CREATE TRIGGER set_booking_tracking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_tracking_code();

-- ── User avatar storage cleanup (phase-27) ──
CREATE OR REPLACE FUNCTION public.cleanup_user_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  old_url text := OLD.avatar_url;
  old_path text;
BEGIN
  IF old_url IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  old_path := regexp_replace(old_url, '^.*/storage/v1/object/public/avatars/', '');

  IF old_path = old_url THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  DELETE FROM storage.objects
   WHERE bucket_id = 'avatars'
     AND name = old_path;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_user_avatar() FROM PUBLIC;

DROP TRIGGER IF EXISTS users_avatar_cleanup_on_update ON public.users;
CREATE TRIGGER users_avatar_cleanup_on_update
  AFTER UPDATE OF avatar_url ON public.users
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND OLD.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.cleanup_user_avatar();

DROP TRIGGER IF EXISTS users_avatar_cleanup_on_delete ON public.users;
CREATE TRIGGER users_avatar_cleanup_on_delete
  AFTER DELETE ON public.users
  FOR EACH ROW
  WHEN (OLD.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.cleanup_user_avatar();

-- ===== RBAC PRIVATE HELPERS (phase-08) =====

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

-- Revoke execute from public-facing roles, then re-grant the SECURITY
-- DEFINER helpers that RLS policies depend on.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.current_user_can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role_name() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO authenticated;

-- ===== CALLABLE RPCs (final form) =====

-- create_event_from_template (phase-10; reconciled to phase-25:
-- cues no longer has an `assignee` column, so it is not copied).
CREATE OR REPLACE FUNCTION public.create_event_from_template(
  p_template_id  uuid,
  p_scheduled_at timestamptz,
  p_title        text DEFAULT NULL,
  p_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_template     RECORD;
  v_event_id     uuid;
  v_track_map    RECORD;
BEGIN
  SELECT id, workspace_id, title, description, duration
  INTO v_template
  FROM public.event_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Event template "%" not found.', p_template_id;
  END IF;

  INSERT INTO public.events (workspace_id, title, description, scheduled_at, duration)
  VALUES (
    v_template.workspace_id,
    coalesce(p_title, v_template.title),
    coalesce(p_description, v_template.description),
    p_scheduled_at,
    v_template.duration
  )
  RETURNING id INTO v_event_id;

  FOR v_track_map IN
    WITH inserted_tracks AS (
      INSERT INTO public.tracks (event_id, name, color_id, sort_order)
      SELECT v_event_id, tt.name, tt.color_id, tt.sort_order
      FROM public.template_tracks tt
      WHERE tt.event_template_id = p_template_id
      ORDER BY tt.sort_order
      RETURNING id, sort_order
    )
    SELECT
      tt.id  AS old_track_id,
      it.id  AS new_track_id
    FROM public.template_tracks tt
    JOIN inserted_tracks it ON it.sort_order = tt.sort_order
    WHERE tt.event_template_id = p_template_id
  LOOP
    INSERT INTO public.cues (track_id, label, start, duration, type, notes)
    SELECT
      v_track_map.new_track_id,
      tc.label,
      tc.start,
      tc.duration,
      tc.type,
      tc.notes
    FROM public.template_cues tc
    WHERE tc.template_track_id = v_track_map.old_track_id;
  END LOOP;

  RETURN v_event_id;
END;
$$;

-- create_checklist_from_template (phase-10)
CREATE OR REPLACE FUNCTION public.create_checklist_from_template(
  p_template_id  uuid,
  p_scheduled_at timestamptz,
  p_name         text DEFAULT NULL,
  p_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_template      RECORD;
  v_checklist_id  uuid;
  v_section_map   RECORD;
BEGIN
  SELECT id, workspace_id, name, description
  INTO v_template
  FROM public.checklist_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Checklist template "%" not found.', p_template_id;
  END IF;

  INSERT INTO public.checklists (workspace_id, name, description, scheduled_at)
  VALUES (
    v_template.workspace_id,
    coalesce(p_name, v_template.name),
    coalesce(p_description, v_template.description),
    p_scheduled_at
  )
  RETURNING id INTO v_checklist_id;

  FOR v_section_map IN
    WITH inserted_sections AS (
      INSERT INTO public.checklist_sections (checklist_id, name, sort_order)
      SELECT v_checklist_id, ts.name, ts.sort_order
      FROM public.template_sections ts
      WHERE ts.checklist_template_id = p_template_id
      ORDER BY ts.sort_order
      RETURNING id, sort_order
    )
    SELECT
      ts.id  AS old_section_id,
      ins.id AS new_section_id
    FROM public.template_sections ts
    JOIN inserted_sections ins ON ins.sort_order = ts.sort_order
    WHERE ts.checklist_template_id = p_template_id
  LOOP
    INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
    SELECT
      v_checklist_id,
      v_section_map.new_section_id,
      ti.label,
      false,
      ti.sort_order
    FROM public.template_items ti
    WHERE ti.checklist_template_id = p_template_id
      AND ti.template_section_id = v_section_map.old_section_id;
  END LOOP;

  INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
  SELECT
    v_checklist_id,
    NULL,
    ti.label,
    false,
    ti.sort_order
  FROM public.template_items ti
  WHERE ti.checklist_template_id = p_template_id
    AND ti.template_section_id IS NULL;

  RETURN v_checklist_id;
END;
$$;

-- save_template_tracks (phase-25 upsert-by-id FINAL version)
CREATE OR REPLACE FUNCTION public.save_template_tracks(
  p_event_template_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_track_ids uuid[];
  v_incoming_cue_ids   uuid[];
BEGIN
  SELECT coalesce(array_agg((track.value->>'id')::uuid), '{}')
  INTO v_incoming_track_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value);

  SELECT coalesce(array_agg((cue.value->>'id')::uuid), '{}')
  INTO v_incoming_cue_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(value);

  DELETE FROM public.template_cues
  WHERE template_track_id IN (
    SELECT id FROM public.template_tracks WHERE event_template_id = p_event_template_id
  )
    AND id <> ALL(v_incoming_cue_ids);

  DELETE FROM public.template_tracks
  WHERE event_template_id = p_event_template_id
    AND id <> ALL(v_incoming_track_ids);

  INSERT INTO public.template_tracks (id, event_template_id, name, color_id, sort_order)
  SELECT track.id, p_event_template_id, track.name, colors.id, track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color_id = EXCLUDED.color_id,
    sort_order = EXCLUDED.sort_order;

  INSERT INTO public.template_cues (id, template_track_id, label, start, duration, type, notes)
  SELECT cue.id, (track.value->>'id')::uuid, cue.label, cue.start, cue.duration, cue.type, cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    notes text
  )
  ON CONFLICT (id) DO UPDATE SET
    template_track_id = EXCLUDED.template_track_id,
    label = EXCLUDED.label,
    start = EXCLUDED.start,
    duration = EXCLUDED.duration,
    type = EXCLUDED.type,
    notes = EXCLUDED.notes;
END;
$$;

-- save_event_tracks (phase-25 upsert-by-id FINAL version)
CREATE OR REPLACE FUNCTION public.save_event_tracks(
  p_event_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_track_ids uuid[];
  v_incoming_cue_ids   uuid[];
BEGIN
  SELECT coalesce(array_agg((track.value->>'id')::uuid), '{}')
  INTO v_incoming_track_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value);

  SELECT coalesce(array_agg((cue.value->>'id')::uuid), '{}')
  INTO v_incoming_cue_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(value);

  DELETE FROM public.cues
  WHERE track_id IN (
    SELECT id FROM public.tracks WHERE event_id = p_event_id
  )
    AND id <> ALL(v_incoming_cue_ids);

  DELETE FROM public.tracks
  WHERE event_id = p_event_id
    AND id <> ALL(v_incoming_track_ids);

  INSERT INTO public.tracks (id, event_id, name, color_id, sort_order)
  SELECT track.id, p_event_id, track.name, colors.id, track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color_id = EXCLUDED.color_id,
    sort_order = EXCLUDED.sort_order;

  INSERT INTO public.cues (id, track_id, label, start, duration, type, notes)
  SELECT cue.id, (track.value->>'id')::uuid, cue.label, cue.start, cue.duration, cue.type, cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    notes text
  )
  ON CONFLICT (id) DO UPDATE SET
    track_id = EXCLUDED.track_id,
    label = EXCLUDED.label,
    start = EXCLUDED.start,
    duration = EXCLUDED.duration,
    type = EXCLUDED.type,
    notes = EXCLUDED.notes;
END;
$$;

-- save_template_checklist_structure (phase-25 upsert-by-id FINAL version)
-- Drop both possible signatures first so PostgREST/Supabase schema cache
-- doesn't keep resolving an older parameter order.
DROP FUNCTION IF EXISTS public.save_template_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_template_checklist_structure(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.save_template_checklist_structure(
  p_checklist_template_id uuid,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.template_items
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.template_sections
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order)
  SELECT section.id, p_checklist_template_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, NULL, item.label, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = NULL,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, (section.value->>'id')::uuid, item.label, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = EXCLUDED.template_section_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;
END;
$$;

-- save_checklist_structure (phase-25 upsert-by-id FINAL version)
DROP FUNCTION IF EXISTS public.save_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_checklist_structure(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.save_checklist_structure(
  p_checklist_id uuid,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.checklist_items
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.checklist_sections
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.checklist_sections (id, checklist_id, name, sort_order)
  SELECT section.id, p_checklist_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, NULL, item.label, item.checked, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = NULL,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, (section.value->>'id')::uuid, item.label, item.checked, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;
END;
$$;

-- ── Public submission RPCs (phase-12, SECURITY DEFINER) ──

CREATE OR REPLACE FUNCTION public.public_submit_request(
  p_workspace_id   uuid,
  p_title          text,
  p_priority       public.request_priority,
  p_category       public.request_category,
  p_due_date       timestamptz,
  p_requested_by   text,
  p_who            text,
  p_what           text,
  p_when_text      text,
  p_where_text     text,
  p_why            text,
  p_how            text,
  p_notes          text DEFAULT NULL,
  p_flow           text DEFAULT NULL,
  p_content        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id   uuid;
  v_tracking     text;
BEGIN
  INSERT INTO public.requests (
    workspace_id, title, priority, category, due_date,
    requested_by, who, what, when_text, where_text, why, how,
    notes, flow, content
  )
  VALUES (
    p_workspace_id, p_title, p_priority, p_category, p_due_date,
    p_requested_by, p_who, p_what, p_when_text, p_where_text, p_why, p_how,
    p_notes, p_flow, p_content
  )
  RETURNING id, tracking_code INTO v_request_id, v_tracking;

  RETURN jsonb_build_object('id', v_request_id, 'tracking_code', v_tracking);
END;
$$;

-- Folded in from 2026-05-27-booking-as-batch.sql (ADR-0006):
-- one header per submission + N booking_items in a single transaction.
CREATE OR REPLACE FUNCTION public.public_submit_booking_batch(
  p_workspace_id       uuid,
  p_title              text,
  p_equipment_ids      uuid[],
  p_booked_by          text,
  p_checked_out_at     timestamptz,
  p_expected_return_at timestamptz,
  p_notes              text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_tracking   text;
BEGIN
  v_tracking := public.generate_tracking_code('BKG');

  INSERT INTO public.bookings (
    workspace_id, tracking_code, title,
    booked_by, checked_out_at, expected_return_at, notes
  )
  VALUES (
    p_workspace_id, v_tracking, p_title,
    p_booked_by, p_checked_out_at, p_expected_return_at, p_notes
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id)
  SELECT v_booking_id, e
  FROM unnest(p_equipment_ids) AS e;

  RETURN jsonb_build_object(
    'booking_id',    v_booking_id,
    'tracking_code', v_tracking,
    'title',         p_title
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.public_browse_equipment(
  p_workspace_id       uuid,
  p_checked_out_at     timestamptz DEFAULT NULL,
  p_expected_return_at timestamptz DEFAULT NULL,
  p_search             text DEFAULT NULL,
  p_category           public.equipment_category DEFAULT NULL
)
RETURNS TABLE (
  id             uuid,
  workspace_id   uuid,
  name           text,
  serial_number  text,
  category       public.equipment_category,
  status         public.equipment_status,
  location       text,
  notes          text,
  last_active_on date,
  thumbnail_url  text,
  is_available   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.workspace_id, e.name, e.serial_number,
      e.category, e.status, e.location, e.notes,
      e.last_active_on, e.thumbnail_url,
      CASE
        WHEN e.status = 'maintenance' THEN false
        WHEN p_checked_out_at IS NULL OR p_expected_return_at IS NULL THEN
          e.status <> 'maintenance'
        ELSE NOT EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        )
      END AS is_available
    FROM public.equipment e
    WHERE e.workspace_id = p_workspace_id
      AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR e.category = p_category)
    ORDER BY
      CASE
        WHEN e.status = 'maintenance' THEN 1
        WHEN p_checked_out_at IS NOT NULL AND p_expected_return_at IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status <> 'returned'
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        ) THEN 1
        ELSE 0
      END,
      e.name;
END;
$$;

-- Folded in from 2026-05-27-booking-as-batch.sql (ADR-0006):
-- booking branch returns one header object with title + items array;
-- items carry no lifecycle (it lives on the parent booking header).
CREATE OR REPLACE FUNCTION public.public_lookup_tracking(
  p_tracking_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result jsonb;
  v_code   text := upper(trim(p_tracking_code));
BEGIN
  SELECT jsonb_build_object(
    'type', 'request',
    'id', r.id,
    'trackingCode', r.tracking_code,
    'title', r.title,
    'status', r.status::text,
    'priority', r.priority::text,
    'category', r.category::text,
    'requestedBy', r.requested_by,
    'dueDate', r.due_date,
    'createdAt', r.created_at
  ) INTO v_result
  FROM public.requests r
  WHERE r.tracking_code = v_code;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'type', 'booking',
    'id', b.id,
    'trackingCode', b.tracking_code,
    'title', b.title,
    'status', b.status::text,
    'bookedBy', b.booked_by,
    'checkedOutAt', b.checked_out_at,
    'expectedReturnAt', b.expected_return_at,
    'returnedAt', b.returned_at,
    'notes', b.notes,
    'createdAt', b.created_at,
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', bi.id,
        'equipmentId', e.id,
        'equipmentName', e.name,
        'equipmentCategory', e.category::text
      ) ORDER BY e.name), '[]'::jsonb)
      FROM public.booking_items bi
      JOIN public.equipment e ON e.id = bi.equipment_id
      WHERE bi.booking_id = b.id
    )
  ) INTO v_result
  FROM public.bookings b
  WHERE b.tracking_code = v_code;

  RETURN v_result;
END;
$$;

-- ── list_signup_workspaces (phase-22) ──
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

-- ── Event sharing RPCs (phase-18) ──
CREATE OR REPLACE FUNCTION public.get_shared_event_view(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share        public.event_shares%ROWTYPE;
  v_event_row    public.events%ROWTYPE;
  v_tracks       jsonb;
  v_playback     jsonb;
BEGIN
  SELECT * INTO v_share
  FROM public.event_shares
  WHERE share_token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_share.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_event_row
  FROM public.events
  WHERE id = v_share.event_id;

  IF v_event_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(track ORDER BY track->>'sort_order'), '[]'::jsonb) INTO v_tracks
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'sort_order', t.sort_order,
      'color_key', c.key,
      'cues', coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', cue.id,
              'label', cue.label,
              'start', cue.start,
              'duration', cue.duration,
              'type', cue.type,
              'notes', cue.notes
            )
            ORDER BY cue.start
          )
          FROM public.cues cue
          WHERE cue.track_id = t.id
        ),
        '[]'::jsonb
      )
    ) AS track
    FROM public.tracks t
    LEFT JOIN public.colors c ON c.id = t.color_id
    WHERE t.event_id = v_share.event_id
  ) sub;

  SELECT to_jsonb(eps) INTO v_playback
  FROM public.event_playback_state eps
  WHERE eps.event_id = v_share.event_id;

  RETURN jsonb_build_object(
    'share', jsonb_build_object(
      'token', v_share.share_token,
      'live_sync_enabled', v_share.live_sync_enabled,
      'expires_at', v_share.expires_at
    ),
    'event', jsonb_build_object(
      'id', v_event_row.id,
      'title', v_event_row.title,
      'description', v_event_row.description,
      'duration', v_event_row.duration,
      'scheduled_at', v_event_row.scheduled_at
    ),
    'tracks', v_tracks,
    'playback', coalesce(v_playback, jsonb_build_object(
      'event_id', v_share.event_id,
      'current_time_min', 0,
      'is_playing', false,
      'playback_speed', 1,
      'updated_at', null
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_event_playback_state(
  p_event_id uuid,
  p_current_time_min numeric,
  p_is_playing boolean,
  p_playback_speed numeric DEFAULT 1
)
RETURNS public.event_playback_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_row public.event_playback_state;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  IF NOT private.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF NOT private.current_user_can('can_update') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  INSERT INTO public.event_playback_state(
    event_id, current_time_min, is_playing, playback_speed, updated_at, updated_by
  )
  VALUES (
    p_event_id, p_current_time_min, p_is_playing, coalesce(p_playback_speed, 1), now(), auth.uid()
  )
  ON CONFLICT (event_id) DO UPDATE SET
    current_time_min = EXCLUDED.current_time_min,
    is_playing       = EXCLUDED.is_playing,
    playback_speed   = EXCLUDED.playback_speed,
    updated_at       = now(),
    updated_by       = auth.uid()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ── save_playlist_lanes (phase-31 SECURITY DEFINER FINAL version) ──
-- Supersedes phase-10's save_playlist_queue, which is intentionally
-- NOT included anywhere in these consolidated scripts.
CREATE OR REPLACE FUNCTION public.save_playlist_lanes(
  p_playlist_id uuid,
  p_lanes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_lane jsonb;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.playlists WHERE id = p_playlist_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Playlist % not found', p_playlist_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT private.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized for this workspace'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.current_user_can('can_update') THEN
    RAISE EXCEPTION 'Not authorized to update playlists'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Serialize concurrent saves for the same playlist. The editor can fire
  -- overlapping saves; without this, two delete-then-insert runs collide on
  -- playlist_lanes_pkey (SQLSTATE 23505 -> HTTP 409). The lock is released
  -- automatically at transaction end.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_playlist_id::text, 0));

  -- queue rows cascade-delete with their lanes.
  DELETE FROM public.playlist_lanes WHERE playlist_id = p_playlist_id;

  FOR v_lane IN
    SELECT * FROM jsonb_array_elements(coalesce(p_lanes, '[]'::jsonb))
  LOOP
    INSERT INTO public.playlist_lanes (id, playlist_id, sort_order, type, name)
    VALUES (
      (v_lane->>'id')::uuid,
      p_playlist_id,
      (v_lane->>'sort_order')::integer,
      coalesce(v_lane->>'type', 'visual'),
      v_lane->>'name'
    );

    INSERT INTO public.queue (id, playlist_id, lane_id, media_id, sort_order, duration, start_sec, in_point, out_point, muted, disabled)
    SELECT
      cue.id,
      p_playlist_id,
      (v_lane->>'id')::uuid,
      cue.media_id,
      cue.sort_order,
      cue.duration,
      cue.start_sec,
      coalesce(cue.in_point, 0),
      cue.out_point,
      coalesce(cue.muted, false),
      cue.disabled
    FROM jsonb_to_recordset(coalesce(v_lane->'cues', '[]'::jsonb)) AS cue(
      id uuid,
      media_id uuid,
      sort_order integer,
      duration integer,
      start_sec numeric,
      in_point numeric,
      out_point numeric,
      muted boolean,
      disabled boolean
    );
  END LOOP;
END;
$$;
