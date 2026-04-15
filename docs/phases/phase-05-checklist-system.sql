-- ============================================================
-- Phase 5 of 10 — Checklist System Tables
-- Requires: Phases 1-4 (enums, base tables, operational + event tables)
-- ============================================================

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
