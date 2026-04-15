-- ============================================================
-- Phase 3 of 10 — Operational Tables
-- Requires: Phases 1-2 (enums, base tables, seed data)
-- ============================================================

-- requests
CREATE TABLE IF NOT EXISTS public.requests (
  id           uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title        text                   NOT NULL,
  priority     public.request_priority NOT NULL,
  status       public.request_status  NOT NULL DEFAULT 'not_started',
  category     public.request_category NOT NULL,
  created_at   timestamptz            NOT NULL DEFAULT now(),
  updated_at   timestamptz            NOT NULL DEFAULT now(),
  requested_by text                   NOT NULL,
  due_date     timestamptz            NOT NULL,
  who          text                   NOT NULL,
  what         text                   NOT NULL,
  when_text    text                   NOT NULL,
  where_text   text                   NOT NULL,
  why          text                   NOT NULL,
  how          text                   NOT NULL,
  notes        text                   NULL,
  flow         text                   NULL,
  content      text                   NULL
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
  id            uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid                    NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text                    NOT NULL,
  serial_number text                    NOT NULL UNIQUE,
  category      public.equipment_category NOT NULL,
  status        public.equipment_status NOT NULL DEFAULT 'available',
  location      text                    NOT NULL,
  notes         text                    NULL,
  last_active_on date                   NULL,
  thumbnail_url text                    NULL
);

-- bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid                  NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  equipment_id      uuid                  NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  booked_by         text                  NOT NULL,
  checked_out_at    timestamptz           NOT NULL,
  expected_return_at timestamptz          NOT NULL,
  returned_at       timestamptz           NULL,
  notes             text                  NULL,
  status            public.booking_status NOT NULL DEFAULT 'booked'
);

-- media
CREATE TABLE IF NOT EXISTS public.media (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid              NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text              NOT NULL,
  type          public.media_type NOT NULL,
  url           text              NOT NULL,
  thumbnail_url text              NULL,
  created_at    timestamptz       NOT NULL DEFAULT now()
);

-- playlists
CREATE TABLE IF NOT EXISTS public.playlists (
  id                     uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name                   text                   NOT NULL,
  description            text                   NOT NULL DEFAULT '',
  status                 public.playlist_status NOT NULL DEFAULT 'draft',
  created_at             timestamptz            NOT NULL DEFAULT now(),
  music_id               uuid                   NULL REFERENCES public.media(id) ON DELETE SET NULL,
  default_image_duration integer                NOT NULL DEFAULT 10
);

-- queue
CREATE TABLE IF NOT EXISTS public.queue (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid    NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  media_id    uuid    NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL,
  duration    integer NULL,
  disabled    boolean NOT NULL DEFAULT false,
  UNIQUE (playlist_id, sort_order)
);
