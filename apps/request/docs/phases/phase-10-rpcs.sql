-- ============================================================
-- Phase 10 of 10 — Template Duplication RPCs
-- Requires: Phases 1-9 (all tables, indexes, triggers, helpers, RLS)
-- Both functions use SECURITY INVOKER to respect RLS.
-- ============================================================

-- 1. create_event_from_template
CREATE OR REPLACE FUNCTION public.create_event_from_template(
  p_template_id  uuid,
  p_scheduled_at timestamptz,
  p_title        text DEFAULT NULL,
  p_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_template     RECORD;
  v_event_id     uuid;
  v_track_map    RECORD;
BEGIN
  -- Look up the template
  SELECT id, workspace_id, title, description, duration
  INTO v_template
  FROM public.event_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Event template "%" not found.', p_template_id;
  END IF;

  -- Create the event
  INSERT INTO public.events (workspace_id, title, description, scheduled_at, duration)
  VALUES (
    v_template.workspace_id,
    coalesce(p_title, v_template.title),
    coalesce(p_description, v_template.description),
    p_scheduled_at,
    v_template.duration
  )
  RETURNING id INTO v_event_id;

  -- Copy tracks and their cues
  FOR v_track_map IN
    WITH inserted_tracks AS (
      INSERT INTO public.tracks (event_id, name, color_id, sort_order)
      SELECT v_event_id, tt.name, tt.color_id, tt.sort_order
      FROM public.template_tracks tt
      WHERE tt.event_template_id = p_template_id
      ORDER BY tt.sort_order
      RETURNING id, sort_order
    )
    SELECT
      tt.id  AS old_track_id,
      it.id  AS new_track_id
    FROM public.template_tracks tt
    JOIN inserted_tracks it ON it.sort_order = tt.sort_order
    WHERE tt.event_template_id = p_template_id
  LOOP
    INSERT INTO public.cues (track_id, label, start, duration, type, assignee, notes)
    SELECT
      v_track_map.new_track_id,
      tc.label,
      tc.start,
      tc.duration,
      tc.type,
      tc.assignee,
      tc.notes
    FROM public.template_cues tc
    WHERE tc.template_track_id = v_track_map.old_track_id;
  END LOOP;

  RETURN v_event_id;
END;
$$;

-- 2. create_checklist_from_template
CREATE OR REPLACE FUNCTION public.create_checklist_from_template(
  p_template_id  uuid,
  p_scheduled_at timestamptz,
  p_name         text DEFAULT NULL,
  p_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_template      RECORD;
  v_checklist_id  uuid;
  v_section_map   RECORD;
BEGIN
  -- Look up the template
  SELECT id, workspace_id, name, description
  INTO v_template
  FROM public.checklist_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Checklist template "%" not found.', p_template_id;
  END IF;

  -- Create the checklist
  INSERT INTO public.checklists (workspace_id, name, description, scheduled_at)
  VALUES (
    v_template.workspace_id,
    coalesce(p_name, v_template.name),
    coalesce(p_description, v_template.description),
    p_scheduled_at
  )
  RETURNING id INTO v_checklist_id;

  -- Copy sections
  FOR v_section_map IN
    WITH inserted_sections AS (
      INSERT INTO public.checklist_sections (checklist_id, name, sort_order)
      SELECT v_checklist_id, ts.name, ts.sort_order
      FROM public.template_sections ts
      WHERE ts.checklist_template_id = p_template_id
      ORDER BY ts.sort_order
      RETURNING id, sort_order
    )
    SELECT
      ts.id  AS old_section_id,
      ins.id AS new_section_id
    FROM public.template_sections ts
    JOIN inserted_sections ins ON ins.sort_order = ts.sort_order
    WHERE ts.checklist_template_id = p_template_id
  LOOP
    -- Copy items that belong to this section
    INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
    SELECT
      v_checklist_id,
      v_section_map.new_section_id,
      ti.label,
      false,
      ti.sort_order
    FROM public.template_items ti
    WHERE ti.checklist_template_id = p_template_id
      AND ti.template_section_id = v_section_map.old_section_id;
  END LOOP;

  -- Copy top-level items (no section)
  INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
  SELECT
    v_checklist_id,
    NULL,
    ti.label,
    false,
    ti.sort_order
  FROM public.template_items ti
  WHERE ti.checklist_template_id = p_template_id
    AND ti.template_section_id IS NULL;

  RETURN v_checklist_id;
END;
$$;
