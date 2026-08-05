-- Ensure checklist runs have a schedulable date for list and calendar views.
-- This remains safe for databases that already received the restored checklist schema.
BEGIN;

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

UPDATE public.checklists
SET scheduled_at = coalesce(created_at, now())
WHERE scheduled_at IS NULL;

ALTER TABLE public.checklists
  ALTER COLUMN scheduled_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checklists_workspace_id_scheduled_at
  ON public.checklists (workspace_id, scheduled_at);

COMMIT;
