-- ============================================================
-- Phase 6 of 10 — Indexes
-- Requires: Phases 1-5 (all tables)
-- ============================================================

-- workspace_users
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON public.workspace_users (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id      ON public.workspace_users (user_id);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles (role_id);

-- requests
CREATE INDEX IF NOT EXISTS idx_requests_workspace_id ON public.requests (workspace_id);

-- request_assignees
CREATE INDEX IF NOT EXISTS idx_request_assignees_request_id ON public.request_assignees (request_id);
CREATE INDEX IF NOT EXISTS idx_request_assignees_user_id    ON public.request_assignees (user_id);

-- equipment
CREATE INDEX IF NOT EXISTS idx_equipment_workspace_id ON public.equipment (workspace_id);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_workspace_id  ON public.bookings (workspace_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment_id  ON public.bookings (equipment_id);

-- media
CREATE INDEX IF NOT EXISTS idx_media_workspace_id ON public.media (workspace_id);

-- playlists
CREATE INDEX IF NOT EXISTS idx_playlists_workspace_id ON public.playlists (workspace_id);

-- queue
CREATE INDEX IF NOT EXISTS idx_queue_playlist_id_sort_order ON public.queue (playlist_id, sort_order);

-- event_templates
CREATE INDEX IF NOT EXISTS idx_event_templates_workspace_id ON public.event_templates (workspace_id);

-- template_tracks
CREATE INDEX IF NOT EXISTS idx_template_tracks_event_template_id_sort_order ON public.template_tracks (event_template_id, sort_order);

-- template_cues
CREATE INDEX IF NOT EXISTS idx_template_cues_template_track_id_start ON public.template_cues (template_track_id, start);

-- events
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON public.events (workspace_id);

-- tracks
CREATE INDEX IF NOT EXISTS idx_tracks_event_id_sort_order ON public.tracks (event_id, sort_order);

-- cues
CREATE INDEX IF NOT EXISTS idx_cues_track_id_start ON public.cues (track_id, start);

-- checklist_templates
CREATE INDEX IF NOT EXISTS idx_checklist_templates_workspace_id ON public.checklist_templates (workspace_id);

-- template_sections
CREATE INDEX IF NOT EXISTS idx_template_sections_checklist_template_id_sort_order ON public.template_sections (checklist_template_id, sort_order);

-- template_items
CREATE INDEX IF NOT EXISTS idx_template_items_checklist_template_id_sort_order ON public.template_items (checklist_template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_template_items_template_section_id_sort_order    ON public.template_items (template_section_id, sort_order);

-- checklists
CREATE INDEX IF NOT EXISTS idx_checklists_workspace_id ON public.checklists (workspace_id);

-- checklist_sections
CREATE INDEX IF NOT EXISTS idx_checklist_sections_checklist_id_sort_order ON public.checklist_sections (checklist_id, sort_order);

-- checklist_items
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id_sort_order ON public.checklist_items (checklist_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_items_section_id_sort_order   ON public.checklist_items (section_id, sort_order);
