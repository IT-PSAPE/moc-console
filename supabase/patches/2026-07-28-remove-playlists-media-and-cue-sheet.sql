-- 2026-07-28 — Remove playlists, media library and the Cue Sheet (QSheets)
--
-- The console was simplified down to five features: Requests, Archive,
-- Equipment, Bookings and Streams. Three whole domains went with that:
--
--   * Playlists   — the Broadcasts authoring area (playlists, lanes, queue)
--   * Media       — the media library table (the storage BUCKET stays; see below)
--   * Cue Sheet   — events, tracks, cues, checklists, templates, shares,
--                   playback state, and their assignee join tables
--
-- The public MOC Broadcast player app (apps/broadcast) was deleted in the same
-- change, so nothing reads published playlists any more.
--
-- DESTRUCTIVE. Every row in the tables below is deleted. Take a backup first.
-- Run this against Supabase yourself — it is not executed by the app.

BEGIN;

-- ===== CUE SHEET =====
-- Child-first so FK dependencies unwind cleanly; CASCADE mops up the
-- indexes, RLS policies and updated_at triggers attached to each table.

DROP TABLE IF EXISTS public.checklist_item_assignees CASCADE;
DROP TABLE IF EXISTS public.checklist_items          CASCADE;
DROP TABLE IF EXISTS public.checklist_sections       CASCADE;
DROP TABLE IF EXISTS public.checklists               CASCADE;
DROP TABLE IF EXISTS public.template_items           CASCADE;
DROP TABLE IF EXISTS public.template_sections        CASCADE;
DROP TABLE IF EXISTS public.checklist_templates      CASCADE;

DROP TABLE IF EXISTS public.cue_assignees            CASCADE;
DROP TABLE IF EXISTS public.cues                     CASCADE;
DROP TABLE IF EXISTS public.tracks                   CASCADE;
DROP TABLE IF EXISTS public.event_playback_state     CASCADE;
DROP TABLE IF EXISTS public.event_shares             CASCADE;
DROP TABLE IF EXISTS public.events                   CASCADE;
DROP TABLE IF EXISTS public.template_cues            CASCADE;
DROP TABLE IF EXISTS public.template_tracks          CASCADE;
DROP TABLE IF EXISTS public.event_templates          CASCADE;

-- ===== PLAYLISTS + MEDIA =====
-- `queue` holds a playlist's media items (its cues); `playlist_lanes` holds
-- the lane rows those cues sit on.

DROP TABLE IF EXISTS public.queue          CASCADE;
DROP TABLE IF EXISTS public.playlist_lanes CASCADE;
DROP TABLE IF EXISTS public.playlists      CASCADE;
DROP TABLE IF EXISTS public.media          CASCADE;

-- ===== FUNCTIONS =====
-- Templating, structure-saving, public share view and playhead sync — all
-- cue-sheet only. The trailing trigger function belonged to event_shares.

DROP FUNCTION IF EXISTS public.create_event_from_template(uuid, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.create_checklist_from_template(uuid, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.save_template_tracks(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_event_tracks(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_template_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.get_shared_event_view(text);
DROP FUNCTION IF EXISTS public.upsert_event_playback_state(uuid, numeric, boolean, numeric);
DROP FUNCTION IF EXISTS public.set_event_shares_updated_at();

-- ===== ENUM TYPES =====
-- Safe only after the tables above are gone. `equipment_status` keeps its
-- 'maintenance' value — maintenance is now a filter on the Equipment page,
-- not a separate feature, and the value is still in use.

DROP TYPE IF EXISTS public.media_type;
DROP TYPE IF EXISTS public.playlist_status;
DROP TYPE IF EXISTS public.cue_type;

-- ===== NOTIFICATION TEMPLATES =====
-- Cue and checklist-item assignment DMs no longer exist. Any workspace that
-- customised those templates would otherwise keep an unreachable row that the
-- settings UI can no longer render.

DELETE FROM public.notification_message_templates
WHERE message_type IN ('assignment.cue', 'assignment.checklist_item');

COMMIT;

-- ===== NOT DROPPED — deliberate =====
--
-- storage bucket 'media' and its four storage.objects policies are KEPT.
-- Stream thumbnails still upload there, under
--   <workspace_id>/stream-thumbnails/…
-- and existing stream thumbnail URLs point at it. Only the `public.media`
-- TABLE (the library index) is gone.
--
-- Old playlist/media objects still sitting in that bucket are left in place —
-- deleting storage objects is unrecoverable and is a separate, deliberate
-- housekeeping step. To purge them once you're satisfied nothing references
-- them, remove the objects whose path does NOT start with
-- '<workspace_id>/stream-thumbnails/' via the Storage UI or the admin API.
