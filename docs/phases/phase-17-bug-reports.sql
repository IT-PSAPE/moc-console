-- ============================================================
-- Phase 17 — Bug Reports
-- Requires: Phase 2 (users table), Phase 9 (RLS pattern)
-- ============================================================
-- Stores in-app "Report a bug" submissions. The user only
-- writes a description; everything else (device, viewport,
-- url, locale) is captured automatically by the client at the
-- moment of submission so we can reproduce the issue without
-- a back-and-forth.
-- ============================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.bug_report_status AS ENUM ('new', 'triaged', 'in_progress', 'resolved', 'wontfix');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- bug_reports
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id               uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid                    NULL REFERENCES public.users(id) ON DELETE SET NULL,
  description      text                    NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  url              text                    NULL,
  user_agent       text                    NULL,
  platform         text                    NULL,
  viewport_width   integer                 NULL,
  viewport_height  integer                 NULL,
  device_pixel_ratio numeric               NULL,
  timezone         text                    NULL,
  locale           text                    NULL,
  app_version      text                    NULL,
  status           public.bug_report_status NOT NULL DEFAULT 'new',
  resolution_notes text                    NULL,
  created_at       timestamptz             NOT NULL DEFAULT now(),
  updated_at       timestamptz             NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS bug_reports_user_id_idx    ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx     ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON public.bug_reports(created_at DESC);

-- updated_at trigger
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

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user, scoped to themselves
DROP POLICY IF EXISTS "bug_reports_insert" ON public.bug_reports;
CREATE POLICY "bug_reports_insert" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: own reports, or admins (can_manage_roles)
DROP POLICY IF EXISTS "bug_reports_select" ON public.bug_reports;
CREATE POLICY "bug_reports_select" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

-- UPDATE: admins only (status / resolution notes)
DROP POLICY IF EXISTS "bug_reports_update" ON public.bug_reports;
CREATE POLICY "bug_reports_update" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));
