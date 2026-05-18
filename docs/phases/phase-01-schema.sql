-- ============================================================
-- 01-schema.sql — Consolidated Schema (fresh install)
-- ============================================================
-- Auto-consolidated from docs/phases/phase-01..phase-31 (the
-- incremental migration ledger). All later ALTER/patch phases are
-- folded into final-state CREATE TABLE / enum / index definitions;
-- backfill UPDATEs and patch-only ALTERs are intentionally dropped
-- because this targets a brand-new EMPTY database.
--
-- Run order on a fresh Supabase project:
--   (optional) phase-00-nuke.sql   — reset an existing database
--   01-schema.sql                  — this file (extensions, enums,
--                                    tables, indexes, the ONLY seed)
--   02-logic.sql                   — functions, triggers, RPCs
--   03-security.sql                — RLS, policies, storage, grants
--
-- The SEED block at the end of this file is the ONLY data inserted.
-- No phase-11 sample/demo data is included anywhere.
-- ============================================================

-- ===== EXTENSIONS & SCHEMAS =====

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;

-- ===== ENUM TYPES =====

DO $$ BEGIN
  CREATE TYPE public.request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('not_started', 'in_progress', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_category AS ENUM ('video_production', 'video_shooting', 'graphic_design', 'event', 'education');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_category AS ENUM ('camera', 'lens', 'lighting', 'audio', 'support', 'monitor', 'cable', 'accessory');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_status AS ENUM ('available', 'booked', 'booked_out', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('booked', 'checked_out', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_type AS ENUM ('image', 'audio', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.playlist_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cue_type AS ENUM ('performance', 'technical', 'equipment', 'announcement', 'transition');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- phase-13 enums
DO $$ BEGIN
  CREATE TYPE public.stream_status AS ENUM ('created', 'ready', 'live', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.zoom_meeting_type AS ENUM ('instant', 'scheduled', 'recurring_no_fixed', 'recurring_fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.zoom_recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- phase-17 enum
DO $$ BEGIN
  CREATE TYPE public.bug_report_status AS ENUM ('new', 'triaged', 'in_progress', 'resolved', 'wontfix');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== TABLES =====

-- colors
CREATE TABLE IF NOT EXISTS public.colors (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key   text NOT NULL UNIQUE,
  name  text NOT NULL
);

-- roles
CREATE TABLE IF NOT EXISTS public.roles (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text    NOT NULL UNIQUE,
  can_create       boolean NOT NULL DEFAULT false,
  can_read         boolean NOT NULL DEFAULT false,
  can_update       boolean NOT NULL DEFAULT false,
  can_delete       boolean NOT NULL DEFAULT false,
  can_manage_roles boolean NOT NULL DEFAULT false
);

-- workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  slug        text        NOT NULL UNIQUE,
  description text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- users (id matches auth.users.id — no default uuid)
-- avatar_url folded in from phase-26.
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  surname          text NOT NULL,
  email            text NOT NULL UNIQUE,
  telegram_chat_id text UNIQUE NULL,
  avatar_url       text NULL
);

-- user_roles (one role per user)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL    REFERENCES public.roles(id) ON DELETE RESTRICT
);

-- workspace_users
CREATE TABLE IF NOT EXISTS public.workspace_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- requests
-- tracking_code folded in from phase-12 (NOT NULL, keeps UNIQUE).
CREATE TABLE IF NOT EXISTS public.requests (
  id            uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid                    NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title         text                    NOT NULL,
  priority      public.request_priority NOT NULL,
  status        public.request_status   NOT NULL DEFAULT 'not_started',
  category      public.request_category NOT NULL,
  created_at    timestamptz             NOT NULL DEFAULT now(),
  updated_at    timestamptz             NOT NULL DEFAULT now(),
  requested_by  text                    NOT NULL,
  due_date      timestamptz             NOT NULL,
  who           text                    NOT NULL,
  what          text                    NOT NULL,
  when_text     text                    NOT NULL,
  where_text    text                    NOT NULL,
  why           text                    NOT NULL,
  how           text                    NOT NULL,
  notes         text                    NULL,
  flow          text                    NULL,
  content       text                    NULL,
  tracking_code text                    NOT NULL UNIQUE
);

-- request_assignees
CREATE TABLE IF NOT EXISTS public.request_assignees (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty       text NOT NULL,
  UNIQUE (request_id, user_id, duty)
);

-- equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id             uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid                      NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           text                      NOT NULL,
  serial_number  text                      NOT NULL UNIQUE,
  category       public.equipment_category NOT NULL,
  status         public.equipment_status   NOT NULL DEFAULT 'available',
  location       text                      NOT NULL,
  notes          text                      NULL,
  last_active_on date                      NULL,
  thumbnail_url  text                      NULL
);

-- bookings
-- tracking_code folded in from phase-12: NOT NULL, NO unique constraint
-- (batch bookings share one code).
CREATE TABLE IF NOT EXISTS public.bookings (
  id                 uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid                  NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  equipment_id       uuid                  NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  booked_by          text                  NOT NULL,
  checked_out_at     timestamptz           NOT NULL,
  expected_return_at timestamptz           NOT NULL,
  returned_at        timestamptz           NULL,
  notes              text                  NULL,
  status             public.booking_status NOT NULL DEFAULT 'booked',
  tracking_code      text                  NOT NULL
);

-- media
-- duration_seconds/width/height: intrinsic media metadata probed client-side
-- on upload (no server ffprobe). NULL = not yet measured; the playlist's
-- default_image_duration is the fallback. Folded in from patches/.
CREATE TABLE IF NOT EXISTS public.media (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid              NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name             text              NOT NULL,
  type             public.media_type NOT NULL,
  url              text              NOT NULL,
  thumbnail_url    text              NULL,
  duration_seconds numeric           NULL,
  width            integer           NULL,
  height           integer           NULL,
  blob_fetchable   boolean           NULL,
  created_at       timestamptz       NOT NULL DEFAULT now()
);

-- playlists
-- phase-29 columns + CHECK constraints + self-FK next_playlist_id folded in.
CREATE TABLE IF NOT EXISTS public.playlists (
  id                     uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name                   text                   NOT NULL,
  description            text                   NOT NULL DEFAULT '',
  status                 public.playlist_status NOT NULL DEFAULT 'draft',
  created_at             timestamptz            NOT NULL DEFAULT now(),
  music_id               uuid                   NULL REFERENCES public.media(id) ON DELETE SET NULL,
  default_image_duration integer                NOT NULL DEFAULT 10,
  thumbnail_url          text                   NULL,
  playback_mode          text                   NOT NULL DEFAULT 'loop',
  next_playlist_id       uuid                   NULL REFERENCES public.playlists(id) ON DELETE SET NULL,
  transition             text                   NOT NULL DEFAULT 'cut',
  transition_duration_ms integer                NOT NULL DEFAULT 500,
  CONSTRAINT playlists_playback_mode_check        CHECK (playback_mode IN ('loop', 'stop', 'sequence')),
  CONSTRAINT playlists_transition_check           CHECK (transition IN ('cut', 'fade', 'crossfade')),
  CONSTRAINT playlists_transition_duration_check  CHECK (transition_duration_ms >= 0)
);

-- playlist_lanes (phase-30) — must exist before queue (queue.lane_id FK)
CREATE TABLE IF NOT EXISTS public.playlist_lanes (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid    NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL,
  type        text    NOT NULL DEFAULT 'visual',
  name        text    NULL,
  UNIQUE (playlist_id, sort_order)
);

-- queue
-- phase-30: lane_id NOT NULL folded in; final UNIQUE is (lane_id, sort_order)
-- (the original UNIQUE (playlist_id, sort_order) is intentionally dropped).
-- playlist_id is intentionally KEPT (denormalised parent for RLS).
CREATE TABLE IF NOT EXISTS public.queue (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid    NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  lane_id     uuid    NOT NULL REFERENCES public.playlist_lanes(id) ON DELETE CASCADE,
  media_id    uuid    NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL,
  duration    integer NULL,
  -- start_sec: explicit timeline position (NULL = legacy gapless append).
  -- in_point/out_point: non-destructive video/audio trim into the source.
  -- muted: per-clip video audio (default off — videos play their sound).
  -- Folded in from patches/.
  start_sec   numeric NULL,
  in_point    numeric NOT NULL DEFAULT 0,
  out_point   numeric NULL,
  muted       boolean NOT NULL DEFAULT false,
  disabled    boolean NOT NULL DEFAULT false,
  CONSTRAINT queue_lane_id_sort_order_key UNIQUE (lane_id, sort_order)
);

-- event_templates
CREATE TABLE IF NOT EXISTS public.event_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  duration     integer     NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- template_tracks
CREATE TABLE IF NOT EXISTS public.template_tracks (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_template_id uuid    NOT NULL REFERENCES public.event_templates(id) ON DELETE CASCADE,
  name              text    NOT NULL,
  color_id          uuid    NOT NULL REFERENCES public.colors(id) ON DELETE RESTRICT,
  sort_order        integer NOT NULL
);

-- template_cues
-- phase-25 dropped the free-text `assignee` column: it never exists here.
CREATE TABLE IF NOT EXISTS public.template_cues (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  template_track_id uuid            NOT NULL REFERENCES public.template_tracks(id) ON DELETE CASCADE,
  label             text            NOT NULL,
  start             integer         NOT NULL,
  duration          integer         NOT NULL,
  type              public.cue_type NOT NULL,
  notes             text            NULL
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration     integer     NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- tracks
CREATE TABLE IF NOT EXISTS public.tracks (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid    NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name       text    NOT NULL,
  color_id   uuid    NOT NULL REFERENCES public.colors(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL
);

-- cues
-- phase-25 dropped the free-text `assignee` column: it never exists here.
CREATE TABLE IF NOT EXISTS public.cues (
  id       uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid            NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  label    text            NOT NULL,
  start    integer         NOT NULL,
  duration integer         NOT NULL,
  type     public.cue_type NOT NULL,
  notes    text            NULL
);

-- cue_assignees (phase-25 junction table) — after cues + users
CREATE TABLE IF NOT EXISTS public.cue_assignees (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id  uuid NOT NULL REFERENCES public.cues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty    text NOT NULL,
  UNIQUE (cue_id, user_id, duty)
);

-- checklist_templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- template_sections
CREATE TABLE IF NOT EXISTS public.template_sections (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid    NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  name                  text    NOT NULL,
  sort_order            integer NOT NULL
);

-- template_items
CREATE TABLE IF NOT EXISTS public.template_items (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid    NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  template_section_id   uuid    NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  label                 text    NOT NULL,
  sort_order            integer NOT NULL
);

-- checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- checklist_sections
CREATE TABLE IF NOT EXISTS public.checklist_sections (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid    NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  name         text    NOT NULL,
  sort_order   integer NOT NULL
);

-- checklist_items
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid    NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  section_id   uuid    NULL REFERENCES public.checklist_sections(id) ON DELETE CASCADE,
  label        text    NOT NULL,
  checked      boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL
);

-- checklist_item_assignees (phase-25 junction table) — after checklist_items + users
CREATE TABLE IF NOT EXISTS public.checklist_item_assignees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty              text NOT NULL,
  UNIQUE (checklist_item_id, user_id, duty)
);

-- youtube_connections (phase-13; token_expires_at NOT NULL folded from phase-16)
CREATE TABLE IF NOT EXISTS public.youtube_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id       text        NOT NULL,
  channel_title    text        NOT NULL,
  presets          jsonb       NULL,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_by     uuid        NOT NULL REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

-- streams (phase-13; phase-14 advanced columns + phase-28 notified_at folded in)
CREATE TABLE IF NOT EXISTS public.streams (
  id                   uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid                 NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_broadcast_id text                 NOT NULL,
  youtube_stream_id    text                 NOT NULL,
  title                text                 NOT NULL,
  description          text                 NOT NULL DEFAULT '',
  thumbnail_url        text                 NULL,
  privacy_status       text                 NOT NULL DEFAULT 'unlisted',
  is_for_kids          boolean              NOT NULL DEFAULT false,
  scheduled_start_time timestamptz          NULL,
  actual_start_time    timestamptz          NULL,
  actual_end_time      timestamptz          NULL,
  stream_status        public.stream_status NOT NULL DEFAULT 'created',
  stream_url           text                 NULL,
  stream_key           text                 NULL,
  ingestion_url        text                 NULL,
  category_id          text                 NULL,
  tags                 text[]               NOT NULL DEFAULT '{}',
  latency_preference   text                 NOT NULL DEFAULT 'normal',
  enable_dvr           boolean              NOT NULL DEFAULT true,
  enable_embed         boolean              NOT NULL DEFAULT true,
  enable_auto_start    boolean              NOT NULL DEFAULT false,
  enable_auto_stop     boolean              NOT NULL DEFAULT true,
  playlist_id          text                 NULL,
  notified_at          timestamptz          NULL,
  created_by           uuid                 NOT NULL REFERENCES public.users(id),
  created_at           timestamptz          NOT NULL DEFAULT now(),
  updated_at           timestamptz          NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_broadcast_id)
);

-- zoom_connections (phase-13)
CREATE TABLE IF NOT EXISTS public.zoom_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  zoom_user_id     text        NOT NULL,
  email            text        NOT NULL,
  display_name     text        NOT NULL,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_by     uuid        NOT NULL REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

-- zoom_meetings (phase-13; phase-28 notified_at folded in)
CREATE TABLE IF NOT EXISTS public.zoom_meetings (
  id                  uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid                        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  zoom_meeting_id     bigint                      NOT NULL,
  topic               text                        NOT NULL,
  description         text                        NOT NULL DEFAULT '',
  meeting_type        public.zoom_meeting_type    NOT NULL DEFAULT 'scheduled',
  start_time          timestamptz                 NULL,
  duration            integer                     NOT NULL DEFAULT 60,
  timezone            text                        NOT NULL DEFAULT 'UTC',
  join_url            text                        NULL,
  start_url           text                        NULL,
  password            text                        NULL,
  recurrence_type     public.zoom_recurrence_type NOT NULL DEFAULT 'none',
  recurrence_interval integer                     NULL,
  recurrence_days     text                        NULL,
  waiting_room        boolean                     NOT NULL DEFAULT true,
  mute_on_entry       boolean                     NOT NULL DEFAULT true,
  continuous_chat     boolean                     NOT NULL DEFAULT false,
  notified_at         timestamptz                 NULL,
  created_by          uuid                        NOT NULL REFERENCES public.users(id),
  created_at          timestamptz                 NOT NULL DEFAULT now(),
  updated_at          timestamptz                 NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, zoom_meeting_id)
);

-- bug_reports (phase-17; phase-19 error_context folded in)
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id                 uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid                     NULL REFERENCES public.users(id) ON DELETE SET NULL,
  description        text                     NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  url                text                     NULL,
  user_agent         text                     NULL,
  platform           text                     NULL,
  viewport_width     integer                  NULL,
  viewport_height    integer                  NULL,
  device_pixel_ratio numeric                  NULL,
  timezone           text                     NULL,
  locale             text                     NULL,
  app_version        text                     NULL,
  status             public.bug_report_status NOT NULL DEFAULT 'new',
  resolution_notes   text                     NULL,
  error_context      jsonb                    NULL,
  created_at         timestamptz              NOT NULL DEFAULT now(),
  updated_at         timestamptz              NOT NULL DEFAULT now()
);

-- event_shares (phase-18)
CREATE TABLE IF NOT EXISTS public.event_shares (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  share_token       text        NOT NULL UNIQUE,
  is_active         boolean     NOT NULL DEFAULT true,
  live_sync_enabled boolean     NOT NULL DEFAULT true,
  created_by        uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NULL
);

-- event_playback_state (phase-18)
CREATE TABLE IF NOT EXISTS public.event_playback_state (
  event_id         uuid        PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  current_time_min numeric     NOT NULL DEFAULT 0,
  is_playing       boolean     NOT NULL DEFAULT false,
  playback_speed   numeric     NOT NULL DEFAULT 1,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL
);

-- telegram_link_tokens (phase-20)
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token      text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- telegram_groups (phase-21; phase-23 workspace_id NOT NULL folded in)
CREATE TABLE IF NOT EXISTS public.telegram_groups (
  chat_id      text        PRIMARY KEY,
  title        text        NOT NULL,
  type         text        NOT NULL,
  is_forum     boolean     NOT NULL DEFAULT false,
  active       boolean     NOT NULL DEFAULT false,
  added_at     timestamptz NOT NULL DEFAULT now(),
  removed_at   timestamptz NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- telegram_group_topics (phase-21)
CREATE TABLE IF NOT EXISTS public.telegram_group_topics (
  group_chat_id text        NOT NULL REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id     bigint      NOT NULL,
  name          text        NOT NULL,
  closed        boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_chat_id, thread_id)
);

-- notification_routes (phase-28)
CREATE TABLE IF NOT EXISTS public.notification_routes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  group_chat_id text        NOT NULL REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id     bigint      NULL,
  enabled       boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- notification_message_templates (phase-29)
-- Per-workspace custom text for Telegram notifications. One row per
-- (workspace, scope, message_type); absence of a row means "use the
-- hardcoded default", so existing workspaces are unaffected.
--   scope        — 'group' (event routing) | 'dm' (assignment DMs)
--   message_type — NotificationEventKey for group scope, or
--                   'assignment.request' | 'assignment.cue' |
--                   'assignment.checklist_item' for dm scope
CREATE TABLE IF NOT EXISTS public.notification_message_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope        text        NOT NULL,
  message_type text        NOT NULL,
  body         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ===== INDEXES =====

-- workspace_users
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON public.workspace_users (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id      ON public.workspace_users (user_id);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles (role_id);

-- requests
CREATE INDEX IF NOT EXISTS idx_requests_workspace_id ON public.requests (workspace_id);

-- request_assignees
CREATE INDEX IF NOT EXISTS idx_request_assignees_request_id ON public.request_assignees (request_id);
CREATE INDEX IF NOT EXISTS idx_request_assignees_user_id    ON public.request_assignees (user_id);

-- equipment
CREATE INDEX IF NOT EXISTS idx_equipment_workspace_id ON public.equipment (workspace_id);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_workspace_id  ON public.bookings (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment_id  ON public.bookings (equipment_id);

-- media
CREATE INDEX IF NOT EXISTS idx_media_workspace_id ON public.media (workspace_id);

-- playlists
CREATE INDEX IF NOT EXISTS idx_playlists_workspace_id ON public.playlists (workspace_id);

-- queue (phase-06 original + phase-30 lane index)
CREATE INDEX IF NOT EXISTS idx_queue_playlist_id_sort_order ON public.queue (playlist_id, sort_order);
CREATE INDEX IF NOT EXISTS queue_lane_id_idx ON public.queue (lane_id);

-- playlist_lanes (phase-30)
CREATE INDEX IF NOT EXISTS playlist_lanes_playlist_id_idx ON public.playlist_lanes (playlist_id);

-- event_templates
CREATE INDEX IF NOT EXISTS idx_event_templates_workspace_id ON public.event_templates (workspace_id);

-- template_tracks
CREATE INDEX IF NOT EXISTS idx_template_tracks_event_template_id_sort_order ON public.template_tracks (event_template_id, sort_order);

-- template_cues
CREATE INDEX IF NOT EXISTS idx_template_cues_template_track_id_start ON public.template_cues (template_track_id, start);

-- events
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON public.events (workspace_id);

-- tracks
CREATE INDEX IF NOT EXISTS idx_tracks_event_id_sort_order ON public.tracks (event_id, sort_order);

-- cues
CREATE INDEX IF NOT EXISTS idx_cues_track_id_start ON public.cues (track_id, start);

-- cue_assignees (phase-25)
CREATE INDEX IF NOT EXISTS idx_cue_assignees_cue_user ON public.cue_assignees (cue_id, user_id);

-- checklist_templates
CREATE INDEX IF NOT EXISTS idx_checklist_templates_workspace_id ON public.checklist_templates (workspace_id);

-- template_sections
CREATE INDEX IF NOT EXISTS idx_template_sections_checklist_template_id_sort_order ON public.template_sections (checklist_template_id, sort_order);

-- template_items
CREATE INDEX IF NOT EXISTS idx_template_items_checklist_template_id_sort_order ON public.template_items (checklist_template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_template_items_template_section_id_sort_order    ON public.template_items (template_section_id, sort_order);

-- checklists
CREATE INDEX IF NOT EXISTS idx_checklists_workspace_id ON public.checklists (workspace_id);

-- checklist_sections
CREATE INDEX IF NOT EXISTS idx_checklist_sections_checklist_id_sort_order ON public.checklist_sections (checklist_id, sort_order);

-- checklist_items
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id_sort_order ON public.checklist_items (checklist_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_items_section_id_sort_order   ON public.checklist_items (section_id, sort_order);

-- checklist_item_assignees (phase-25)
CREATE INDEX IF NOT EXISTS idx_checklist_item_assignees_item_user ON public.checklist_item_assignees (checklist_item_id, user_id);

-- youtube_connections / streams (phase-13)
CREATE INDEX IF NOT EXISTS idx_youtube_connections_workspace_id ON public.youtube_connections (workspace_id);
CREATE INDEX IF NOT EXISTS idx_streams_workspace_id ON public.streams (workspace_id);
CREATE INDEX IF NOT EXISTS idx_streams_status       ON public.streams (stream_status);

-- zoom_connections / zoom_meetings (phase-13)
CREATE INDEX IF NOT EXISTS idx_zoom_connections_workspace_id ON public.zoom_connections (workspace_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_workspace_id    ON public.zoom_meetings (workspace_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_start_time      ON public.zoom_meetings (start_time);

-- bug_reports (phase-17 + phase-19)
CREATE INDEX IF NOT EXISTS bug_reports_user_id_idx    ON public.bug_reports (user_id);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx     ON public.bug_reports (status);
CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_error_context_present_idx
  ON public.bug_reports ((error_context IS NOT NULL))
  WHERE error_context IS NOT NULL;

-- event_shares / event_playback_state (phase-18)
CREATE UNIQUE INDEX IF NOT EXISTS event_shares_one_active_per_event_idx
  ON public.event_shares (event_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS event_shares_event_id_idx ON public.event_shares (event_id);
CREATE INDEX IF NOT EXISTS event_playback_state_updated_at_idx
  ON public.event_playback_state (updated_at DESC);

-- telegram_link_tokens (phase-20)
CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_id_idx
  ON public.telegram_link_tokens (user_id);
CREATE INDEX IF NOT EXISTS telegram_link_tokens_expires_at_idx
  ON public.telegram_link_tokens (expires_at);

-- telegram_groups / telegram_group_topics (phase-21 + phase-23)
CREATE INDEX IF NOT EXISTS telegram_groups_active_idx
  ON public.telegram_groups (active) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS telegram_groups_workspace_id_idx
  ON public.telegram_groups (workspace_id);
CREATE INDEX IF NOT EXISTS telegram_group_topics_group_idx
  ON public.telegram_group_topics (group_chat_id);

-- notification_routes (phase-28)
CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_unique_with_topic
  ON public.notification_routes (workspace_id, event_type, group_chat_id, thread_id)
  WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notification_routes_unique_no_topic
  ON public.notification_routes (workspace_id, event_type, group_chat_id)
  WHERE thread_id IS NULL;
CREATE INDEX IF NOT EXISTS notification_routes_lookup_idx
  ON public.notification_routes (workspace_id, event_type) WHERE enabled = true;

-- notification_message_templates (phase-29)
CREATE UNIQUE INDEX IF NOT EXISTS notification_message_templates_unique
  ON public.notification_message_templates (workspace_id, scope, message_type);

-- ===== SEED (the ONLY data; safe to skip/replace for a custom setup) =====

-- Roles
INSERT INTO public.roles (name, can_create, can_read, can_update, can_delete, can_manage_roles)
VALUES
  ('admin',  true,  true, true,  true,  true),
  ('editor', true,  true, true,  true,  false),
  ('viewer', false, true, false, false, false)
ON CONFLICT (name) DO NOTHING;

-- Colors
INSERT INTO public.colors (key, name)
VALUES
  ('blue',   'Blue'),
  ('purple', 'Purple'),
  ('red',    'Red'),
  ('green',  'Green'),
  ('orange', 'Orange'),
  ('pink',   'Pink'),
  ('yellow', 'Yellow'),
  ('teal',   'Teal'),
  ('indigo', 'Indigo'),
  ('rose',   'Rose'),
  ('sky',    'Sky'),
  ('violet', 'Violet')
ON CONFLICT (key) DO NOTHING;

-- Default workspace
INSERT INTO public.workspaces (name, slug)
VALUES ('Default Workspace', 'default-workspace')
ON CONFLICT (slug) DO NOTHING;
