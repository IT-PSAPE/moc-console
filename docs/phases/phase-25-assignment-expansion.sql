-- ============================================================
-- Phase 25 — Assignment System Expansion (issue #35)
-- Adds user assignment with `duty` to cues and checklist_items,
-- mirroring the existing request_assignees pattern (phase-03).
--
-- This phase also rewrites the bulk-replace RPCs from phase-10
-- so they preserve cue / checklist_item rows by id (upsert),
-- which is required so the new assignment rows are not wiped
-- on every track / checklist save.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Replace bulk-save RPCs with upsert-by-id versions.
--    Drops references to the cues.assignee / template_cues.assignee
--    columns ahead of the ALTER TABLE drops below.
-- ------------------------------------------------------------

-- save_template_tracks
CREATE OR REPLACE FUNCTION public.save_template_tracks(
  p_event_template_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_track_ids uuid[];
  v_incoming_cue_ids   uuid[];
BEGIN
  SELECT coalesce(array_agg((track.value->>'id')::uuid), '{}')
  INTO v_incoming_track_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value);

  SELECT coalesce(array_agg((cue.value->>'id')::uuid), '{}')
  INTO v_incoming_cue_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(value);

  DELETE FROM public.template_cues
  WHERE template_track_id IN (
    SELECT id FROM public.template_tracks WHERE event_template_id = p_event_template_id
  )
    AND id <> ALL(v_incoming_cue_ids);

  DELETE FROM public.template_tracks
  WHERE event_template_id = p_event_template_id
    AND id <> ALL(v_incoming_track_ids);

  INSERT INTO public.template_tracks (id, event_template_id, name, color_id, sort_order)
  SELECT track.id, p_event_template_id, track.name, colors.id, track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color_id = EXCLUDED.color_id,
    sort_order = EXCLUDED.sort_order;

  INSERT INTO public.template_cues (id, template_track_id, label, start, duration, type, notes)
  SELECT cue.id, (track.value->>'id')::uuid, cue.label, cue.start, cue.duration, cue.type, cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    notes text
  )
  ON CONFLICT (id) DO UPDATE SET
    template_track_id = EXCLUDED.template_track_id,
    label = EXCLUDED.label,
    start = EXCLUDED.start,
    duration = EXCLUDED.duration,
    type = EXCLUDED.type,
    notes = EXCLUDED.notes;
END;
$$;

-- save_event_tracks
CREATE OR REPLACE FUNCTION public.save_event_tracks(
  p_event_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_track_ids uuid[];
  v_incoming_cue_ids   uuid[];
BEGIN
  SELECT coalesce(array_agg((track.value->>'id')::uuid), '{}')
  INTO v_incoming_track_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value);

  SELECT coalesce(array_agg((cue.value->>'id')::uuid), '{}')
  INTO v_incoming_cue_ids
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(value);

  DELETE FROM public.cues
  WHERE track_id IN (
    SELECT id FROM public.tracks WHERE event_id = p_event_id
  )
    AND id <> ALL(v_incoming_cue_ids);

  DELETE FROM public.tracks
  WHERE event_id = p_event_id
    AND id <> ALL(v_incoming_track_ids);

  INSERT INTO public.tracks (id, event_id, name, color_id, sort_order)
  SELECT track.id, p_event_id, track.name, colors.id, track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color_id = EXCLUDED.color_id,
    sort_order = EXCLUDED.sort_order;

  INSERT INTO public.cues (id, track_id, label, start, duration, type, notes)
  SELECT cue.id, (track.value->>'id')::uuid, cue.label, cue.start, cue.duration, cue.type, cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    notes text
  )
  ON CONFLICT (id) DO UPDATE SET
    track_id = EXCLUDED.track_id,
    label = EXCLUDED.label,
    start = EXCLUDED.start,
    duration = EXCLUDED.duration,
    type = EXCLUDED.type,
    notes = EXCLUDED.notes;
END;
$$;

-- save_template_checklist_structure
DROP FUNCTION IF EXISTS public.save_template_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_template_checklist_structure(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.save_template_checklist_structure(
  p_checklist_template_id uuid,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.template_items
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.template_sections
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order)
  SELECT section.id, p_checklist_template_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, NULL, item.label, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = NULL,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, (section.value->>'id')::uuid, item.label, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = EXCLUDED.template_section_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;
END;
$$;

-- save_checklist_structure
DROP FUNCTION IF EXISTS public.save_checklist_structure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_checklist_structure(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.save_checklist_structure(
  p_checklist_id uuid,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.checklist_items
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.checklist_sections
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.checklist_sections (id, checklist_id, name, sort_order)
  SELECT section.id, p_checklist_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, NULL, item.label, item.checked, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = NULL,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, (section.value->>'id')::uuid, item.label, item.checked, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;
END;
$$;

-- ------------------------------------------------------------
-- 2) Drop legacy free-text assignee columns.
--    Free text is unmappable to user_ids; no data migration.
-- ------------------------------------------------------------

ALTER TABLE public.cues          DROP COLUMN IF EXISTS assignee;
ALTER TABLE public.template_cues DROP COLUMN IF EXISTS assignee;

-- ------------------------------------------------------------
-- 3) Junction tables for assignment.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cue_assignees (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id  uuid NOT NULL REFERENCES public.cues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty    text NOT NULL,
  UNIQUE (cue_id, user_id, duty)
);

CREATE TABLE IF NOT EXISTS public.checklist_item_assignees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty              text NOT NULL,
  UNIQUE (checklist_item_id, user_id, duty)
);

-- ------------------------------------------------------------
-- 4) Indexes for parent-key lookups.
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_cue_assignees_cue_user
  ON public.cue_assignees (cue_id, user_id);

CREATE INDEX IF NOT EXISTS idx_checklist_item_assignees_item_user
  ON public.checklist_item_assignees (checklist_item_id, user_id);

-- ------------------------------------------------------------
-- 5) Enable RLS on the new junction tables.
-- ------------------------------------------------------------

ALTER TABLE public.cue_assignees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_assignees  ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 6) RLS policies — mirror request_assignees (phase-09:480-538).
--    Walk the parent chain to workspace_id via private helpers.
-- ------------------------------------------------------------

-- cue_assignees: cues -> tracks -> events.workspace_id

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

-- checklist_item_assignees: checklist_items -> checklists.workspace_id

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
