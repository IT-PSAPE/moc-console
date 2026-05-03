-- ============================================================
-- Phase 19 — Bug Report Error Context
-- Requires: Phase 17 (bug_reports table)
-- ============================================================
-- Adds an optional jsonb column to bug_reports to capture
-- structured error metadata when a report is filed from the
-- in-app ErrorBoundary fallback (error name, message, stack,
-- React component stack, route at the time of the crash, etc).
-- Keeps the user-written `description` clean of technical noise.
-- ============================================================

ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS error_context jsonb NULL;

CREATE INDEX IF NOT EXISTS bug_reports_error_context_present_idx
  ON public.bug_reports ((error_context IS NOT NULL))
  WHERE error_context IS NOT NULL;
