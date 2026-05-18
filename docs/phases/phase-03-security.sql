-- ============================================================
-- 03-security.sql — Consolidated RLS, Policies, Storage & Grants
-- ============================================================
-- Auto-consolidated from docs/phases/phase-01..phase-31. Where a
-- later phase replaced an earlier policy (phase-23 telegram_groups,
-- phase-24 workspaces UPDATE) only the FINAL resolved policy is
-- emitted. Storage buckets are created before their policies.
--
-- Run order: (00-nuke optional) -> 01-schema -> 02-logic -> 03-security.
-- 01-schema's SEED block is the only data inserted.
-- ============================================================

-- ===== ENABLE ROW LEVEL SECURITY =====

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
ALTER TABLE public.playlist_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cue_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_playback_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_group_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_message_templates ENABLE ROW LEVEL SECURITY;

-- ===== IDENTITY TABLE POLICIES (phase-09) =====

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

-- phase-24 adds the UPDATE policy (admins on workspaces they belong to)
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(id)
    AND private.current_user_can('can_manage_roles')
  )
  WITH CHECK (
    private.is_workspace_member(id)
    AND private.current_user_can('can_manage_roles')
  );

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

-- ===== WORKSPACE-SCOPED OPERATIONAL TABLES (phase-09) =====

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

-- phase-29: anon may read media referenced by a published playlist
DROP POLICY IF EXISTS "media_public_select" ON public.media;
CREATE POLICY "media_public_select" ON public.media
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.queue q
      JOIN public.playlists p ON p.id = q.playlist_id
      WHERE q.media_id = media.id
        AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1
      FROM public.playlists p
      WHERE p.music_id = media.id
        AND p.status = 'published'
    )
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

-- phase-29: anon may read published playlists only
DROP POLICY IF EXISTS "playlists_public_select" ON public.playlists;
CREATE POLICY "playlists_public_select" ON public.playlists
  FOR SELECT TO anon
  USING (status = 'published');

-- playlist_lanes (phase-30) -----------------------------------
DROP POLICY IF EXISTS "playlist_lanes_select" ON public.playlist_lanes;
CREATE POLICY "playlist_lanes_select" ON public.playlist_lanes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_lanes.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "playlist_lanes_insert" ON public.playlist_lanes;
CREATE POLICY "playlist_lanes_insert" ON public.playlist_lanes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_lanes.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "playlist_lanes_update" ON public.playlist_lanes;
CREATE POLICY "playlist_lanes_update" ON public.playlist_lanes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_lanes.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_lanes.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "playlist_lanes_delete" ON public.playlist_lanes;
CREATE POLICY "playlist_lanes_delete" ON public.playlist_lanes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_lanes.playlist_id
        AND private.is_workspace_member(playlists.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- phase-30: anon read of lanes for published playlists
DROP POLICY IF EXISTS "playlist_lanes_public_select" ON public.playlist_lanes;
CREATE POLICY "playlist_lanes_public_select" ON public.playlist_lanes
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_lanes.playlist_id
        AND p.status = 'published'
    )
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

-- phase-29: anon may read queue rows of published playlists
DROP POLICY IF EXISTS "queue_public_select" ON public.queue;
CREATE POLICY "queue_public_select" ON public.queue
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = queue.playlist_id
        AND p.status = 'published'
    )
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

-- ===== SUBORDINATE TABLE POLICIES (phase-09) =====

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

-- template_tracks (parent: event_templates) -------------------
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

-- tracks (parent: events via event_id) ------------------------
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

-- cue_assignees (chain: cues -> tracks -> events) — phase-25 ---
DROP POLICY IF EXISTS "cue_assignees_select" ON public.cue_assignees;
CREATE POLICY "cue_assignees_select" ON public.cue_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cues
      JOIN public.tracks ON tracks.id = cues.track_id
      JOIN public.events ON events.id = tracks.event_id
      WHERE cues.id = cue_assignees.cue_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "cue_assignees_insert" ON public.cue_assignees;
CREATE POLICY "cue_assignees_insert" ON public.cue_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cues
      JOIN public.tracks ON tracks.id = cues.track_id
      JOIN public.events ON events.id = tracks.event_id
      WHERE cues.id = cue_assignees.cue_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "cue_assignees_update" ON public.cue_assignees;
CREATE POLICY "cue_assignees_update" ON public.cue_assignees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cues
      JOIN public.tracks ON tracks.id = cues.track_id
      JOIN public.events ON events.id = tracks.event_id
      WHERE cues.id = cue_assignees.cue_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cues
      JOIN public.tracks ON tracks.id = cues.track_id
      JOIN public.events ON events.id = tracks.event_id
      WHERE cues.id = cue_assignees.cue_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "cue_assignees_delete" ON public.cue_assignees;
CREATE POLICY "cue_assignees_delete" ON public.cue_assignees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cues
      JOIN public.tracks ON tracks.id = cues.track_id
      JOIN public.events ON events.id = tracks.event_id
      WHERE cues.id = cue_assignees.cue_id
        AND private.is_workspace_member(events.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- template_sections (parent: checklist_templates) -------------
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

-- template_items (parent: checklist_templates) ----------------
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

-- checklist_item_assignees (parent: checklist_items -> checklists) — phase-25
DROP POLICY IF EXISTS "checklist_item_assignees_select" ON public.checklist_item_assignees;
CREATE POLICY "checklist_item_assignees_select" ON public.checklist_item_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_items
      JOIN public.checklists ON checklists.id = checklist_items.checklist_id
      WHERE checklist_items.id = checklist_item_assignees.checklist_item_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "checklist_item_assignees_insert" ON public.checklist_item_assignees;
CREATE POLICY "checklist_item_assignees_insert" ON public.checklist_item_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.checklist_items
      JOIN public.checklists ON checklists.id = checklist_items.checklist_id
      WHERE checklist_items.id = checklist_item_assignees.checklist_item_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "checklist_item_assignees_update" ON public.checklist_item_assignees;
CREATE POLICY "checklist_item_assignees_update" ON public.checklist_item_assignees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_items
      JOIN public.checklists ON checklists.id = checklist_items.checklist_id
      WHERE checklist_items.id = checklist_item_assignees.checklist_item_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.checklist_items
      JOIN public.checklists ON checklists.id = checklist_items.checklist_id
      WHERE checklist_items.id = checklist_item_assignees.checklist_item_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "checklist_item_assignees_delete" ON public.checklist_item_assignees;
CREATE POLICY "checklist_item_assignees_delete" ON public.checklist_item_assignees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_items
      JOIN public.checklists ON checklists.id = checklist_items.checklist_id
      WHERE checklist_items.id = checklist_item_assignees.checklist_item_id
        AND private.is_workspace_member(checklists.workspace_id)
    )
    AND private.current_user_can('can_delete')
  );

-- ===== STREAMS / ZOOM POLICIES (phase-13) =====

-- youtube_connections (admin-only for connect/disconnect)
DROP POLICY IF EXISTS "youtube_connections_select" ON public.youtube_connections;
CREATE POLICY "youtube_connections_select" ON public.youtube_connections
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "youtube_connections_insert" ON public.youtube_connections;
CREATE POLICY "youtube_connections_insert" ON public.youtube_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "youtube_connections_update" ON public.youtube_connections;
CREATE POLICY "youtube_connections_update" ON public.youtube_connections
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "youtube_connections_delete" ON public.youtube_connections;
CREATE POLICY "youtube_connections_delete" ON public.youtube_connections
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

-- streams (standard CRUD pattern)
DROP POLICY IF EXISTS "streams_select" ON public.streams;
CREATE POLICY "streams_select" ON public.streams
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "streams_insert" ON public.streams;
CREATE POLICY "streams_insert" ON public.streams
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "streams_update" ON public.streams;
CREATE POLICY "streams_update" ON public.streams
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "streams_delete" ON public.streams;
CREATE POLICY "streams_delete" ON public.streams
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- zoom_connections (admin-only for connect/disconnect)
DROP POLICY IF EXISTS "zoom_connections_select" ON public.zoom_connections;
CREATE POLICY "zoom_connections_select" ON public.zoom_connections
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "zoom_connections_insert" ON public.zoom_connections;
CREATE POLICY "zoom_connections_insert" ON public.zoom_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "zoom_connections_update" ON public.zoom_connections;
CREATE POLICY "zoom_connections_update" ON public.zoom_connections
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "zoom_connections_delete" ON public.zoom_connections;
CREATE POLICY "zoom_connections_delete" ON public.zoom_connections
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_manage_roles')
  );

-- zoom_meetings (standard CRUD pattern)
DROP POLICY IF EXISTS "zoom_meetings_select" ON public.zoom_meetings;
CREATE POLICY "zoom_meetings_select" ON public.zoom_meetings
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "zoom_meetings_insert" ON public.zoom_meetings;
CREATE POLICY "zoom_meetings_insert" ON public.zoom_meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_create')
  );

DROP POLICY IF EXISTS "zoom_meetings_update" ON public.zoom_meetings;
CREATE POLICY "zoom_meetings_update" ON public.zoom_meetings
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "zoom_meetings_delete" ON public.zoom_meetings;
CREATE POLICY "zoom_meetings_delete" ON public.zoom_meetings
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND private.current_user_can('can_delete')
  );

-- ===== BUG REPORTS POLICIES (phase-17) =====

DROP POLICY IF EXISTS "bug_reports_insert" ON public.bug_reports;
CREATE POLICY "bug_reports_insert" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bug_reports_select" ON public.bug_reports;
CREATE POLICY "bug_reports_select" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "bug_reports_update" ON public.bug_reports;
CREATE POLICY "bug_reports_update" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

-- ===== EVENT SHARING POLICIES (phase-18) =====

DROP POLICY IF EXISTS "event_shares_select" ON public.event_shares;
CREATE POLICY "event_shares_select" ON public.event_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "event_shares_insert" ON public.event_shares;
CREATE POLICY "event_shares_insert" ON public.event_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_shares_update" ON public.event_shares;
CREATE POLICY "event_shares_update" ON public.event_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_shares_delete" ON public.event_shares;
CREATE POLICY "event_shares_delete" ON public.event_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_shares.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_playback_state_select" ON public.event_playback_state;
CREATE POLICY "event_playback_state_select" ON public.event_playback_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

DROP POLICY IF EXISTS "event_playback_state_insert" ON public.event_playback_state;
CREATE POLICY "event_playback_state_insert" ON public.event_playback_state
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

DROP POLICY IF EXISTS "event_playback_state_update" ON public.event_playback_state;
CREATE POLICY "event_playback_state_update" ON public.event_playback_state
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_playback_state.event_id
        AND private.is_workspace_member(e.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

-- ===== TELEGRAM LINKING POLICIES (phase-20) =====

DROP POLICY IF EXISTS "telegram_link_tokens_insert_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_insert_self" ON public.telegram_link_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_link_tokens_select_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_select_self" ON public.telegram_link_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_link_tokens_delete_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_delete_self" ON public.telegram_link_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===== TELEGRAM GROUPS / TOPICS POLICIES (phase-23 FINAL — supersedes phase-21) =====

DROP POLICY IF EXISTS "telegram_groups_select_admin" ON public.telegram_groups;
DROP POLICY IF EXISTS "telegram_groups_select" ON public.telegram_groups;
CREATE POLICY "telegram_groups_select" ON public.telegram_groups
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "telegram_groups_update_admin" ON public.telegram_groups;
DROP POLICY IF EXISTS "telegram_groups_update" ON public.telegram_groups;
CREATE POLICY "telegram_groups_update" ON public.telegram_groups
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  )
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "telegram_group_topics_select_admin" ON public.telegram_group_topics;
DROP POLICY IF EXISTS "telegram_group_topics_select" ON public.telegram_group_topics;
CREATE POLICY "telegram_group_topics_select" ON public.telegram_group_topics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.telegram_groups g
      WHERE g.chat_id = group_chat_id
        AND (
          private.is_workspace_member(g.workspace_id)
          OR private.current_user_can('can_manage_roles')
        )
    )
  );

-- ===== NOTIFICATION ROUTES POLICIES (phase-28) =====

DROP POLICY IF EXISTS "notification_routes_select" ON public.notification_routes;
CREATE POLICY "notification_routes_select" ON public.notification_routes
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_routes_insert" ON public.notification_routes;
CREATE POLICY "notification_routes_insert" ON public.notification_routes
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_routes_update" ON public.notification_routes;
CREATE POLICY "notification_routes_update" ON public.notification_routes
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_routes_delete" ON public.notification_routes;
CREATE POLICY "notification_routes_delete" ON public.notification_routes
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));

-- notification_message_templates (phase-29) — mirrors notification_routes:
-- workspace members can read; only role managers can write.
DROP POLICY IF EXISTS "notification_message_templates_select" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_select" ON public.notification_message_templates
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    OR private.current_user_can('can_manage_roles')
  );

DROP POLICY IF EXISTS "notification_message_templates_insert" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_insert" ON public.notification_message_templates
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_message_templates_update" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_update" ON public.notification_message_templates
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "notification_message_templates_delete" ON public.notification_message_templates;
CREATE POLICY "notification_message_templates_delete" ON public.notification_message_templates
  FOR DELETE TO authenticated
  USING (private.current_user_can('can_manage_roles'));

-- ===== STORAGE BUCKETS + POLICIES =====
-- Buckets MUST be created before their storage.objects policies.

-- media bucket (phase-15)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- avatars bucket (phase-26)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- media bucket policies (phase-15)
DROP POLICY IF EXISTS "media_bucket_public_read" ON storage.objects;
CREATE POLICY "media_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_insert" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_update" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_delete" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media');

-- avatars bucket policies (phase-26)
DROP POLICY IF EXISTS "avatars_bucket_public_read" ON storage.objects;
CREATE POLICY "avatars_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_bucket_owner_insert" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_bucket_owner_update" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_bucket_owner_delete" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== SCHEMA-LEVEL GRANTS ON PUBLIC RPCs =====

-- phase-12: public submission/lookup RPCs
GRANT EXECUTE ON FUNCTION public.public_submit_request(uuid, text, public.request_priority, public.request_category, timestamptz, text, text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid, uuid[], text, timestamptz, timestamptz, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category) TO anon;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO anon;

GRANT EXECUTE ON FUNCTION public.public_submit_request(uuid, text, public.request_priority, public.request_category, timestamptz, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_booking_batch(uuid, uuid[], text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_browse_equipment(uuid, timestamptz, timestamptz, text, public.equipment_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_tracking(text) TO authenticated;

-- phase-22: list_signup_workspaces
GRANT EXECUTE ON FUNCTION public.list_signup_workspaces() TO anon, authenticated;

-- phase-18: event sharing RPCs
REVOKE ALL ON FUNCTION public.get_shared_event_view(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_event_view(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.upsert_event_playback_state(uuid, numeric, boolean, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_event_playback_state(uuid, numeric, boolean, numeric) TO authenticated;
