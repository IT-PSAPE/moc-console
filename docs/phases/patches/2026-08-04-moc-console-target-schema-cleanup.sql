-- 2026-08-04 — MoC Console target-schema cleanup.
--
-- TARGET: Supabase project jypshhgfuvwmtbbcxmhs (MoC Console).
-- BASELINE: live schema inspected on 2026-08-04.
--
-- THIS MIGRATION IS DESTRUCTIVE. It permanently removes retired database
-- tables and their rows. Take a database backup before running it.
--
-- Retained data includes users, workspace memberships, requests, equipment,
-- current bookings, standalone checklists, streams/meetings, notification
-- configuration, Telegram configuration, avatars, and media-bucket objects.
--
-- Removed data includes the old bookings backup, Broadcast playlists/library,
-- Cue Sheet events/tracks/cues/templates/shares/playback, colors, and the
-- legacy global user_roles table after its values are copied into
-- workspace_users.role_id.
--
-- Paste and run this entire file once. All work is atomic.

BEGIN;

-- Preflight: fail before deleting anything when the inspected baseline has
-- drifted in a way that would make the role or OAuth migrations unsafe.
DO $$
BEGIN
  IF to_regclass('public.workspace_users') IS NULL
    OR to_regclass('public.user_roles') IS NULL
    OR to_regclass('public.roles') IS NULL
    OR to_regclass('public.checklists') IS NULL
    OR to_regclass('public.youtube_connections') IS NULL
    OR to_regclass('public.zoom_connections') IS NULL
  THEN
    RAISE EXCEPTION 'Required MoC Console baseline tables are missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'viewer') THEN
    RAISE EXCEPTION 'The viewer role required for safe membership backfill is missing';
  END IF;
END;
$$;

-- Retired RPCs and trigger helpers.
DROP FUNCTION IF EXISTS public.create_event_from_template(uuid, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.save_template_tracks(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_event_tracks(uuid, jsonb);
DROP FUNCTION IF EXISTS public.get_shared_event_view(text);
DROP FUNCTION IF EXISTS public.upsert_event_playback_state(uuid, numeric, boolean, numeric);
DROP FUNCTION IF EXISTS public.set_event_shares_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.save_playlist_lanes(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_playlist_queue(uuid, jsonb);

-- Obsolete public endpoint overloads. Only the workspace-bound signatures
-- explicitly granted later remain.
DROP FUNCTION IF EXISTS public.public_browse_equipment(text, public.equipment_category);
DROP FUNCTION IF EXISTS public.public_browse_equipment(uuid, text, public.equipment_category);
DROP FUNCTION IF EXISTS public.public_submit_booking(uuid, text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.public_submit_booking(uuid, uuid, text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.public_submit_request(
  text,
  public.request_priority,
  public.request_category,
  timestamptz,
  text, text, text, text, text, text, text, text, text, text
);

-- Retired feature tables, child-first. The storage.media bucket is not a
-- public.media table and is deliberately untouched.
DROP TABLE IF EXISTS public.bookings_old CASCADE;
DROP TABLE IF EXISTS public.cue_assignees CASCADE;
DROP TABLE IF EXISTS public.cues CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
DROP TABLE IF EXISTS public.event_playback_state CASCADE;
DROP TABLE IF EXISTS public.event_shares CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.template_cues CASCADE;
DROP TABLE IF EXISTS public.template_tracks CASCADE;
DROP TABLE IF EXISTS public.event_templates CASCADE;
DROP TABLE IF EXISTS public.colors CASCADE;
DROP TABLE IF EXISTS public.queue CASCADE;
DROP TABLE IF EXISTS public.playlist_lanes CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;

DROP TYPE IF EXISTS public.media_type;
DROP TYPE IF EXISTS public.playlist_status;
DROP TYPE IF EXISTS public.cue_type;

DELETE FROM public.notification_message_templates
WHERE message_type IN ('assignment.cue', 'assignment.checklist_item');

-- Link standalone checklist runs to the request that prompted the work.

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS request_id uuid NULL REFERENCES public.requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklists_request_id
  ON public.checklists (request_id)
  WHERE request_id IS NOT NULL;

-- 2026-08-04 — Harden tenant joins and OAuth credential boundaries.
--
-- This is additive and backfills existing data before removing the member-readable
-- credential columns. Run after the existing schema/patch ledger, including
-- 2026-08-04-checklist-run-request-links.sql.


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

-- Durable Telegram delivery queue.
--
-- Every notification target is first persisted as a pending delivery. The API
-- may attempt it immediately, but a failed attempt remains eligible for the
-- delivery cron instead of being lost after an entity-level "notified" claim.

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,
  entity_type         text        NOT NULL,
  entity_id           uuid        NOT NULL,
  event_key           text        NOT NULL UNIQUE,
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'failed')),
  attempt_count       integer     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_attempt_at     timestamptz NULL,
  last_error          text        NULL,
  dispatched_at       timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_ready_idx
  ON public.notification_outbox (next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_key           text        NOT NULL,
  event_type          text        NULL,
  scope               text        NOT NULL CHECK (scope IN ('group', 'dm')),
  route_id            uuid        NULL REFERENCES public.notification_routes(id) ON DELETE SET NULL,
  recipient_user_id   uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  destination_key     text        NOT NULL,
  chat_id             text        NOT NULL,
  thread_id           bigint      NULL,
  text                text        NOT NULL,
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count       integer     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_attempt_at     timestamptz NULL,
  sent_at             timestamptz NULL,
  telegram_message_id bigint      NULL,
  last_error          text        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, destination_key)
);

CREATE INDEX IF NOT EXISTS notification_deliveries_ready_idx
  ON public.notification_deliveries (next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS notification_deliveries_workspace_created_idx
  ON public.notification_deliveries (workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS set_notification_outbox_updated_at ON public.notification_outbox;
CREATE TRIGGER set_notification_outbox_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notification_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER set_notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Delivery rows contain message content and recipient destinations. They are
-- written and retried exclusively by the service-role API until a dedicated
-- operator history surface is introduced.

CREATE OR REPLACE FUNCTION public.enqueue_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'request.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := CASE WHEN NEW.status = 'archived'
      THEN 'request.archived'
      ELSE 'request.status_changed'
    END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'request',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.requested_by,
      'requestId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_enqueue_notification ON public.requests;
CREATE TRIGGER requests_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_request_notification();

CREATE OR REPLACE FUNCTION public.enqueue_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'booking.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'booking.status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'booking',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.booked_by,
      'trackingCode', NEW.tracking_code
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enqueue_notification ON public.bookings;
CREATE TRIGGER bookings_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_booking_notification();

CREATE OR REPLACE FUNCTION public.enqueue_stream_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'stream.created',
    'stream',
    NEW.id,
    format('stream.created:%s', NEW.id),
    jsonb_build_object(
      'title', NEW.title,
      'scheduledStartTime', NEW.scheduled_start_time,
      'streamUrl', NEW.stream_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS streams_enqueue_created_notification ON public.streams;
CREATE TRIGGER streams_enqueue_created_notification
  AFTER INSERT ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_stream_created_notification();

CREATE OR REPLACE FUNCTION public.enqueue_meeting_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'meeting.created',
    'meeting',
    NEW.id,
    format('meeting.created:%s', NEW.id),
    jsonb_build_object(
      'topic', NEW.topic,
      'startTime', NEW.start_time,
      'joinUrl', NEW.join_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zoom_meetings_enqueue_created_notification ON public.zoom_meetings;
CREATE TRIGGER zoom_meetings_enqueue_created_notification
  AFTER INSERT ON public.zoom_meetings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_meeting_created_notification();

-- Adds append-only request history and internal comments. Activity is written
-- by a database trigger so every request lifecycle change has server time and
-- the authenticated actor when one is available.

CREATE TABLE IF NOT EXISTS public.request_activity (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id   uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text        NOT NULL CHECK (event_type IN ('created', 'updated', 'title_updated', 'status_changed')),
  details    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id   uuid        NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE RESTRICT,
  body       text        NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_activity_request_created_at
  ON public.request_activity (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_comments_request_created_at
  ON public.request_comments (request_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_request_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_details    jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
    v_details := jsonb_build_object('requester_name', NEW.requested_by);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'status_changed';
    v_details := jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status);
  ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
    v_event_type := 'title_updated';
    v_details := jsonb_build_object('from_title', OLD.title, 'to_title', NEW.title);
  ELSE
    v_event_type := 'updated';
  END IF;

  INSERT INTO public.request_activity (request_id, actor_id, event_type, details)
  VALUES (NEW.id, auth.uid(), v_event_type, v_details);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_request_activity ON public.requests;
CREATE TRIGGER record_request_activity
  AFTER INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.record_request_activity();

ALTER TABLE public.request_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_activity_select" ON public.request_activity
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_activity.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

CREATE POLICY "request_comments_select" ON public.request_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_comments.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

CREATE POLICY "request_comments_insert" ON public.request_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_comments.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

-- Workspace-scoped authorization and approval-only signup. The legacy
-- user_roles table remains only long enough to backfill workspace roles and is
-- dropped by the final normalization block.


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

-- Pin function paths and remove obsolete RPC exposure after creating the new
-- target-schema functions above.


-- Pin every public function that still inherits a caller-controlled search
-- path. Existing explicitly configured functions are left unchanged.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(procedure.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO pg_catalog, public, private, extensions',
      function_row.signature
    );
  END LOOP;
END;
$$;

-- Trigger functions are invoked by their trigger owner and must not be exposed
-- as Data API RPCs.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
  END LOOP;
END;
$$;

-- Remove old public signatures that pre-date explicit workspace selection.
-- The current request application uses only the workspace-bound signatures.
DO $$
DECLARE
  signature regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    to_regprocedure('public.public_browse_equipment(text,public.equipment_category)'),
    to_regprocedure('public.public_browse_equipment(uuid,text,public.equipment_category)'),
    to_regprocedure('public.public_submit_booking(uuid,text,timestamptz,timestamptz,text)'),
    to_regprocedure('public.public_submit_booking(uuid,uuid,text,timestamptz,timestamptz,text)'),
    to_regprocedure('public.public_submit_request(text,public.request_priority,public.request_category,timestamptz,text,text,text,text,text,text,text,text,text,text)')
  ]
  LOOP
    IF signature IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        signature
      );
    END IF;
  END LOOP;
END;
$$;

-- These are signed-in application RPCs, not anonymous endpoints. They may
-- already have been removed by the feature-retirement patch.
DO $$
DECLARE
  signature regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    to_regprocedure('public.save_playlist_lanes(uuid,jsonb)'),
    to_regprocedure('public.upsert_event_playback_state(uuid,numeric,boolean,numeric)')
  ]
  LOOP
    IF signature IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    END IF;
  END LOOP;
END;
$$;

-- Lock privileged maintenance automation to the service role.


-- Revoke every overload so an obsolete signature cannot remain callable by an
-- exposed role. Internal cron/API automation continues through service_role.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'archive_completed_requests',
        'archive_returned_bookings',
        'claim_stale_bookings',
        'claim_stale_requests'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_row.signature
    );
  END LOOP;
END;
$$;

-- The per-workspace role backfill and all dependent policy rewrites are now
-- complete, so the legacy global assignment table can be removed.
DROP TABLE public.user_roles;
DROP FUNCTION IF EXISTS public.prevent_ambiguous_global_role_mutation();
DROP FUNCTION IF EXISTS private.current_user_role_name(uuid);
DROP FUNCTION IF EXISTS private.current_user_can(text);

-- Enable RLS on every retained public table, including tables created above.
DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT format('%I.%I', namespace.nspname, relation.relname) AS qualified_name
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_table.qualified_name);
  END LOOP;
END;
$$;

ALTER TABLE private.integration_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Remove leftover rollout policies and policies for operations that now exist
-- only behind checked RPCs or the service-role API.
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "booking_items_insert" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_update" ON public.booking_items;
DROP POLICY IF EXISTS "booking_items_delete" ON public.booking_items;
DROP POLICY IF EXISTS "youtube_connections_insert" ON public.youtube_connections;
DROP POLICY IF EXISTS "youtube_connections_delete" ON public.youtube_connections;
DROP POLICY IF EXISTS "zoom_connections_insert" ON public.zoom_connections;
DROP POLICY IF EXISTS "zoom_connections_update" ON public.zoom_connections;
DROP POLICY IF EXISTS "zoom_connections_delete" ON public.zoom_connections;

-- Adopt explicit, deny-by-default Data API grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Accepted-member directory and workspace selection.
GRANT SELECT ON
  public.roles,
  public.workspaces,
  public.workspace_users,
  public.workspace_join_requests
TO authenticated;
GRANT UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Core operational data.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.requests,
  public.request_assignees,
  public.equipment,
  public.checklist_templates,
  public.template_sections,
  public.template_items,
  public.checklists,
  public.checklist_sections,
  public.checklist_items,
  public.checklist_item_assignees,
  public.streams,
  public.zoom_meetings,
  public.notification_settings,
  public.notification_recipients,
  public.notification_routes,
  public.notification_message_templates
TO authenticated;

GRANT SELECT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT ON public.booking_items TO authenticated;
GRANT SELECT ON public.request_activity TO authenticated;
GRANT SELECT, INSERT ON public.request_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bug_reports TO authenticated;

-- Integrations: credentials and provider lifecycle writes stay server-side.
GRANT SELECT, UPDATE ON public.youtube_connections TO authenticated;
GRANT SELECT ON public.zoom_connections TO authenticated;
GRANT SELECT, UPDATE ON public.telegram_groups TO authenticated;
GRANT SELECT ON public.telegram_group_topics TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.telegram_link_tokens TO authenticated;

-- Queue payloads and OAuth secrets are service-role only.
REVOKE ALL ON
  public.notification_outbox,
  public.notification_deliveries
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.integration_oauth_tokens TO service_role;

-- No function is callable merely because it exists in an exposed schema.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private
  FROM PUBLIC, anon, authenticated, service_role;

-- Deliberately public, workspace-bound request application endpoints.
GRANT EXECUTE ON FUNCTION public.list_signup_workspaces()
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(
  uuid, timestamptz, timestamptz, text, public.equipment_category
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(
  uuid, text, uuid[], text, timestamptz, timestamptz, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_request(
  uuid,
  text,
  public.request_priority,
  public.request_category,
  timestamptz,
  text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated;

-- Accepted-member application RPCs.
GRANT EXECUTE ON FUNCTION public.create_checklist_from_template(
  uuid, timestamptz, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_checklist_structure(uuid, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_template_checklist_structure(uuid, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_workspace_join_request(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_workspace_member_role(uuid, uuid, uuid)
  TO authenticated;

-- Service-only automation and OAuth secret storage.
GRANT EXECUTE ON FUNCTION public.archive_completed_requests()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_returned_bookings()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stale_bookings()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stale_requests()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_integration_oauth_tokens(text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.save_integration_oauth_tokens(
  text, uuid, text, text, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integration_oauth_tokens(text, uuid)
  TO service_role;

-- Private RLS helpers are callable only by accepted authenticated sessions;
-- their bodies still make the membership/permission decision.
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_can(uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.storage_object_workspace_id(text)
  TO authenticated;

-- Final target-state assertions. Any failure rolls back the whole migration.
DO $$
DECLARE
  v_unexpected_tables text;
  v_function record;
BEGIN
  SELECT string_agg(relation.relname, ', ' ORDER BY relation.relname)
  INTO v_unexpected_tables
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
    AND relation.relname <> ALL (ARRAY[
      'booking_items',
      'bookings',
      'bug_reports',
      'checklist_item_assignees',
      'checklist_items',
      'checklist_sections',
      'checklist_templates',
      'checklists',
      'equipment',
      'notification_deliveries',
      'notification_message_templates',
      'notification_outbox',
      'notification_recipients',
      'notification_routes',
      'notification_settings',
      'request_activity',
      'request_assignees',
      'request_comments',
      'requests',
      'roles',
      'streams',
      'telegram_group_topics',
      'telegram_groups',
      'telegram_link_tokens',
      'template_items',
      'template_sections',
      'users',
      'workspace_join_requests',
      'workspace_users',
      'workspaces',
      'youtube_connections',
      'zoom_connections',
      'zoom_meetings'
    ]);

  IF v_unexpected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected public tables remain: %', v_unexpected_tables;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'A retained public table does not have RLS enabled';
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspace_users WHERE role_id IS NULL) THEN
    RAISE EXCEPTION 'workspace_users.role_id backfill is incomplete';
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy global role table still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('youtube_connections', 'zoom_connections')
      AND column_name IN ('access_token', 'refresh_token')
  ) THEN
    RAISE EXCEPTION 'OAuth secrets remain in exposed tables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~ 'private\.current_user_can\(''(can_[a-z_]+)''::text\)'
        OR coalesce(with_check, '') ~ 'private\.current_user_can\(''(can_[a-z_]+)''::text\)'
      )
  ) THEN
    RAISE EXCEPTION 'A public RLS policy still uses a global permission check';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'anon still has a direct public-table grant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(procedure.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  ) THEN
    RAISE EXCEPTION 'A public function has a mutable search_path';
  END IF;

  FOR v_function IN
    SELECT procedure.oid, procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname NOT IN (
        'list_signup_workspaces',
        'public_browse_equipment',
        'public_lookup_tracking',
        'public_submit_booking_batch',
        'public_submit_request'
      )
  LOOP
    IF has_function_privilege('anon', v_function.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected anonymous RPC exposure: %', v_function.signature;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
