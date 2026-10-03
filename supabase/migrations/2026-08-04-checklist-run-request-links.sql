-- Link standalone checklist runs to the request that prompted the work.
BEGIN;

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS request_id uuid NULL REFERENCES public.requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklists_request_id
  ON public.checklists (request_id)
  WHERE request_id IS NOT NULL;

COMMIT;
