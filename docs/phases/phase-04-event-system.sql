-- ============================================================
-- Phase 4 of 10 — Event System Tables
-- Requires: Phases 1-3 (enums, base tables, operational tables)
-- ============================================================

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
CREATE TABLE IF NOT EXISTS public.template_cues (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  template_track_id uuid           NOT NULL REFERENCES public.template_tracks(id) ON DELETE CASCADE,
  label             text           NOT NULL,
  start             integer        NOT NULL,
  duration          integer        NOT NULL,
  type              public.cue_type NOT NULL,
  assignee          text           NULL,
  notes             text           NULL
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
CREATE TABLE IF NOT EXISTS public.cues (
  id       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid           NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  label    text           NOT NULL,
  start    integer        NOT NULL,
  duration integer        NOT NULL,
  type     public.cue_type NOT NULL,
  assignee text           NULL,
  notes    text           NULL
);
