-- ============================================================
-- Phase 0 — Nuke
-- Drops everything in the public and private schemas so the
-- project can be rebuilt from scratch.
-- Does NOT touch auth.users, pgcrypto, or the public schema itself.
-- ============================================================

-- Step 1: Drop all RLS policies on public tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Step 2: Drop ALL triggers on auth.users (dynamic — catches any naming convention)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
  END LOOP;
END $$;

-- Step 3: Drop triggers on public tables
DROP TRIGGER IF EXISTS set_updated_at ON public.workspaces;
DROP TRIGGER IF EXISTS set_updated_at ON public.requests;
DROP TRIGGER IF EXISTS set_updated_at ON public.event_templates;
DROP TRIGGER IF EXISTS set_updated_at ON public.events;
DROP TRIGGER IF EXISTS set_updated_at ON public.checklist_templates;
DROP TRIGGER IF EXISTS set_updated_at ON public.checklists;
DROP TRIGGER IF EXISTS sync_equipment_status ON public.bookings;

-- Step 4: Drop ALL public functions (dynamic — catches any naming convention)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Step 5: Drop private schema (CASCADE takes helper functions with it)
DROP SCHEMA IF EXISTS private CASCADE;

-- Step 6: Drop all public tables (children first, parents last)

-- Level 3: grandchildren
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.checklist_sections CASCADE;
DROP TABLE IF EXISTS public.template_items CASCADE;
DROP TABLE IF EXISTS public.template_sections CASCADE;
DROP TABLE IF EXISTS public.cues CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
DROP TABLE IF EXISTS public.template_cues CASCADE;
DROP TABLE IF EXISTS public.template_tracks CASCADE;
DROP TABLE IF EXISTS public.queue CASCADE;

-- Level 2: direct children
DROP TABLE IF EXISTS public.request_assignees CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;

-- Level 1: workspace-scoped operational tables
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.event_templates CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;

-- Level 0: base / identity tables
DROP TABLE IF EXISTS public.workspace_users CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.colors CASCADE;

-- Step 7: Drop all enums
DROP TYPE IF EXISTS public.cue_type;
DROP TYPE IF EXISTS public.playlist_status;
DROP TYPE IF EXISTS public.media_type;
DROP TYPE IF EXISTS public.booking_status;
DROP TYPE IF EXISTS public.equipment_status;
DROP TYPE IF EXISTS public.equipment_category;
DROP TYPE IF EXISTS public.request_category;
DROP TYPE IF EXISTS public.request_status;
DROP TYPE IF EXISTS public.request_priority;
