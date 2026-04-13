-- ============================================================
-- Phase 2 of 10 — Base Tables and Seed Data
-- Requires: Phase 1 (pgcrypto, private schema, enums)
-- ============================================================

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
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  surname          text NOT NULL,
  email            text NOT NULL UNIQUE,
  telegram_chat_id text UNIQUE NULL
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

-- ============================================================
-- Seed Data (idempotent)
-- ============================================================

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
