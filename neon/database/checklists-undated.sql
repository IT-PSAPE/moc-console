-- Allow checklist runs to be undated without changing any historical values.
ALTER TABLE public.checklists
  ALTER COLUMN scheduled_at DROP NOT NULL;
