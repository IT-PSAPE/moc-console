-- Adds user-level profile fields surfaced on the account settings page.
--
-- current_duty: the user's persistent / semi-permanent duty title
-- (e.g. "Camera Op", "Audio Engineer"). Distinct from public.request_assignees.duty
-- and the other *_assignees.duty columns, which are per-assignment roles. Both
-- are nullable for now — the migration leaves existing rows untouched, and the
-- product expects users to fill these in over time.
--
-- status_message: a short personality blurb shown on the user's profile.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS current_duty    text NULL,
    ADD COLUMN IF NOT EXISTS status_message  text NULL;
