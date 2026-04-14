-- ============================================================
-- Phase 9 of 10 — RLS Policies
-- Requires: Phases 1-8 (all tables, indexes, triggers, private helpers)
-- ============================================================

-- Step 1: Enable RLS on every public table

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2: Identity table policies
-- ============================================================

-- users -------------------------------------------------------

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  )
  WITH CHECK (
    id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

-- roles -------------------------------------------------------

DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- user_roles --------------------------------------------------

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

-- colors ------------------------------------------------------

DROP POLICY IF EXISTS "colors_select" ON public.colors;
CREATE POLICY "colors_select" ON public.colors
  FOR SELECT TO authenticated
  USING (true);

-- workspaces --------------------------------------------------

DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(id));

-- workspace_users ---------------------------------------------

DROP POLICY IF EXISTS "workspace_users_select" ON public.workspace_users;
CREATE POLICY "workspace_users_select" ON public.workspace_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "workspace_users_insert" ON public.workspace_users;
CREATE POLICY "workspace_users_insert" ON public.workspace_users
  FOR INSERT TO authenticated
  WITH CHECK (
    private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "workspace_users_delete" ON public.workspace_users;
CREATE POLICY "workspace_users_delete" ON public.workspace_users
  FOR DELETE TO authenticated
  USING (
    private.current_user_can('can_manage_roles')
  );

-- ============================================================
-- Step 3: Workspace-scoped operational tables
-- Pattern: workspace membership + role permission
-- ============================================================

-- requests ----------------------------------------------------

DROP POLICY IF EXISTS "requests_select" ON public.requests;
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "requests_insert" ON public.requests;
CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "requests_update" ON public.requests;
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "requests_delete" ON public.requests;
CREATE POLICY "requests_delete" ON public.requests
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- equipment ---------------------------------------------------

DROP POLICY IF EXISTS "equipment_select" ON public.equipment;
CREATE POLICY "equipment_select" ON public.equipment
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "equipment_insert" ON public.equipment;
CREATE POLICY "equipment_insert" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "equipment_update" ON public.equipment;
CREATE POLICY "equipment_update" ON public.equipment
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "equipment_delete" ON public.equipment;
CREATE POLICY "equipment_delete" ON public.equipment
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- bookings ----------------------------------------------------

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- media -------------------------------------------------------

DROP POLICY IF EXISTS "media_select" ON public.media;
CREATE POLICY "media_select" ON public.media
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "media_insert" ON public.media;
CREATE POLICY "media_insert" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "media_update" ON public.media;
CREATE POLICY "media_update" ON public.media
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "media_delete" ON public.media;
CREATE POLICY "media_delete" ON public.media
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- playlists ---------------------------------------------------

DROP POLICY IF EXISTS "playlists_select" ON public.playlists;
CREATE POLICY "playlists_select" ON public.playlists
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "playlists_insert" ON public.playlists;
CREATE POLICY "playlists_insert" ON public.playlists
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "playlists_update" ON public.playlists;
CREATE POLICY "playlists_update" ON public.playlists
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "playlists_delete" ON public.playlists;
CREATE POLICY "playlists_delete" ON public.playlists
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- event_templates ---------------------------------------------

DROP POLICY IF EXISTS "event_templates_select" ON public.event_templates;
CREATE POLICY "event_templates_select" ON public.event_templates
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "event_templates_insert" ON public.event_templates;
CREATE POLICY "event_templates_insert" ON public.event_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "event_templates_update" ON public.event_templates;
CREATE POLICY "event_templates_update" ON public.event_templates
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_templates_delete" ON public.event_templates;
CREATE POLICY "event_templates_delete" ON public.event_templates
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- events ------------------------------------------------------

DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_delete" ON public.events
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- checklist_templates -----------------------------------------

DROP POLICY IF EXISTS "checklist_templates_select" ON public.checklist_templates;
CREATE POLICY "checklist_templates_select" ON public.checklist_templates
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "checklist_templates_insert" ON public.checklist_templates;
CREATE POLICY "checklist_templates_insert" ON public.checklist_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "checklist_templates_update" ON public.checklist_templates;
CREATE POLICY "checklist_templates_update" ON public.checklist_templates
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "checklist_templates_delete" ON public.checklist_templates;
CREATE POLICY "checklist_templates_delete" ON public.checklist_templates
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- checklists --------------------------------------------------

DROP POLICY IF EXISTS "checklists_select" ON public.checklists;
CREATE POLICY "checklists_select" ON public.checklists
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "checklists_insert" ON public.checklists;
CREATE POLICY "checklists_insert" ON public.checklists
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "checklists_update" ON public.checklists;
CREATE POLICY "checklists_update" ON public.checklists
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "checklists_delete" ON public.checklists;
CREATE POLICY "checklists_delete" ON public.checklists
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- ============================================================
-- Step 4: Subordinate tables
-- No workspace_id — derive access through parent chain
-- ============================================================

-- request_assignees (parent: requests via request_id) ---------

DROP POLICY IF EXISTS "request_assignees_select" ON public.request_assignees;
CREATE POLICY "request_assignees_select" ON public.request_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_assignees.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "request_assignees_insert" ON public.request_assignees;
CREATE POLICY "request_assignees_insert" ON public.request_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_assignees.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "request_assignees_update" ON public.request_assignees;
CREATE POLICY "request_assignees_update" ON public.request_assignees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_assignees.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_assignees.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "request_assignees_delete" ON public.request_assignees;
CREATE POLICY "request_assignees_delete" ON public.request_assignees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_assignees.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- queue (parent: playlists via playlist_id) -------------------

DROP POLICY IF EXISTS "queue_select" ON public.queue;
CREATE POLICY "queue_select" ON public.queue
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = queue.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "queue_insert" ON public.queue;
CREATE POLICY "queue_insert" ON public.queue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = queue.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "queue_update" ON public.queue;
CREATE POLICY "queue_update" ON public.queue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = queue.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = queue.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "queue_delete" ON public.queue;
CREATE POLICY "queue_delete" ON public.queue
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = queue.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- template_tracks (parent: event_templates via event_template_id)

DROP POLICY IF EXISTS "template_tracks_select" ON public.template_tracks;
CREATE POLICY "template_tracks_select" ON public.template_tracks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_templates
      WHERE event_templates.id = template_tracks.event_template_id
        AND private.is_workspace_member(event_templates.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "template_tracks_insert" ON public.template_tracks;
CREATE POLICY "template_tracks_insert" ON public.template_tracks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_templates
      WHERE event_templates.id = template_tracks.event_template_id
        AND private.is_workspace_member(event_templates.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "template_tracks_update" ON public.template_tracks;
CREATE POLICY "template_tracks_update" ON public.template_tracks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_templates
      WHERE event_templates.id = template_tracks.event_template_id
        AND private.is_workspace_member(event_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_templates
      WHERE event_templates.id = template_tracks.event_template_id
        AND private.is_workspace_member(event_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "template_tracks_delete" ON public.template_tracks;
CREATE POLICY "template_tracks_delete" ON public.template_tracks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_templates
      WHERE event_templates.id = template_tracks.event_template_id
        AND private.is_workspace_member(event_templates.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- template_cues (chain: template_tracks -> event_templates) ---

DROP POLICY IF EXISTS "template_cues_select" ON public.template_cues;
CREATE POLICY "template_cues_select" ON public.template_cues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_tracks tt
      JOIN public.event_templates et ON et.id = tt.event_template_id
      WHERE tt.id = template_cues.template_track_id
        AND private.is_workspace_member(et.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "template_cues_insert" ON public.template_cues;
CREATE POLICY "template_cues_insert" ON public.template_cues
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_tracks tt
      JOIN public.event_templates et ON et.id = tt.event_template_id
      WHERE tt.id = template_cues.template_track_id
        AND private.is_workspace_member(et.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "template_cues_update" ON public.template_cues;
CREATE POLICY "template_cues_update" ON public.template_cues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_tracks tt
      JOIN public.event_templates et ON et.id = tt.event_template_id
      WHERE tt.id = template_cues.template_track_id
        AND private.is_workspace_member(et.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_tracks tt
      JOIN public.event_templates et ON et.id = tt.event_template_id
      WHERE tt.id = template_cues.template_track_id
        AND private.is_workspace_member(et.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "template_cues_delete" ON public.template_cues;
CREATE POLICY "template_cues_delete" ON public.template_cues
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_tracks tt
      JOIN public.event_templates et ON et.id = tt.event_template_id
      WHERE tt.id = template_cues.template_track_id
        AND private.is_workspace_member(et.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- tracks (parent: events via event_id) -----------------------

DROP POLICY IF EXISTS "tracks_select" ON public.tracks;
CREATE POLICY "tracks_select" ON public.tracks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tracks.event_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "tracks_insert" ON public.tracks;
CREATE POLICY "tracks_insert" ON public.tracks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tracks.event_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "tracks_update" ON public.tracks;
CREATE POLICY "tracks_update" ON public.tracks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tracks.event_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tracks.event_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "tracks_delete" ON public.tracks;
CREATE POLICY "tracks_delete" ON public.tracks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tracks.event_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- cues (chain: tracks -> events) ------------------------------

DROP POLICY IF EXISTS "cues_select" ON public.cues;
CREATE POLICY "cues_select" ON public.cues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = cues.track_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "cues_insert" ON public.cues;
CREATE POLICY "cues_insert" ON public.cues
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = cues.track_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "cues_update" ON public.cues;
CREATE POLICY "cues_update" ON public.cues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = cues.track_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = cues.track_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "cues_delete" ON public.cues;
CREATE POLICY "cues_delete" ON public.cues
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = cues.track_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- template_sections (parent: checklist_templates via checklist_template_id)

DROP POLICY IF EXISTS "template_sections_select" ON public.template_sections;
CREATE POLICY "template_sections_select" ON public.template_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_sections.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "template_sections_insert" ON public.template_sections;
CREATE POLICY "template_sections_insert" ON public.template_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_sections.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "template_sections_update" ON public.template_sections;
CREATE POLICY "template_sections_update" ON public.template_sections
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_sections.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_sections.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "template_sections_delete" ON public.template_sections;
CREATE POLICY "template_sections_delete" ON public.template_sections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_sections.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- template_items (parent: checklist_templates via checklist_template_id)

DROP POLICY IF EXISTS "template_items_select" ON public.template_items;
CREATE POLICY "template_items_select" ON public.template_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_items.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "template_items_insert" ON public.template_items;
CREATE POLICY "template_items_insert" ON public.template_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_items.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "template_items_update" ON public.template_items;
CREATE POLICY "template_items_update" ON public.template_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_items.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_items.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "template_items_delete" ON public.template_items;
CREATE POLICY "template_items_delete" ON public.template_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates
      WHERE checklist_templates.id = template_items.checklist_template_id
        AND private.is_workspace_member(checklist_templates.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- checklist_sections (parent: checklists via checklist_id) ----

DROP POLICY IF EXISTS "checklist_sections_select" ON public.checklist_sections;
CREATE POLICY "checklist_sections_select" ON public.checklist_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_sections.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "checklist_sections_insert" ON public.checklist_sections;
CREATE POLICY "checklist_sections_insert" ON public.checklist_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_sections.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "checklist_sections_update" ON public.checklist_sections;
CREATE POLICY "checklist_sections_update" ON public.checklist_sections
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_sections.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_sections.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "checklist_sections_delete" ON public.checklist_sections;
CREATE POLICY "checklist_sections_delete" ON public.checklist_sections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_sections.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- checklist_items (parent: checklists via checklist_id) -------

DROP POLICY IF EXISTS "checklist_items_select" ON public.checklist_items;
CREATE POLICY "checklist_items_select" ON public.checklist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "checklist_items_insert" ON public.checklist_items;
CREATE POLICY "checklist_items_insert" ON public.checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "checklist_items_update" ON public.checklist_items;
CREATE POLICY "checklist_items_update" ON public.checklist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "checklist_items_delete" ON public.checklist_items;
CREATE POLICY "checklist_items_delete" ON public.checklist_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );
