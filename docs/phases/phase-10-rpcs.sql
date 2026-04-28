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

-- 3. save_playlist_queue
CREATE OR REPLACE FUNCTION public.save_playlist_queue(
  p_playlist_id uuid,
  p_cues jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM public.queue
  WHERE playlist_id = p_playlist_id;

  INSERT INTO public.queue (id, playlist_id, media_id, sort_order, duration, disabled)
  SELECT
    cue.id,
    p_playlist_id,
    cue.media_id,
    cue.sort_order,
    cue.duration,
    cue.disabled
  FROM jsonb_to_recordset(coalesce(p_cues, '[]'::jsonb)) AS cue(
    id uuid,
    media_id uuid,
    sort_order integer,
    duration integer,
    disabled boolean
  );
END;
$$;

-- 4. save_template_tracks
CREATE OR REPLACE FUNCTION public.save_template_tracks(
  p_event_template_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_track_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(id), '{}')
  INTO v_track_ids
  FROM public.template_tracks
  WHERE event_template_id = p_event_template_id;

  IF cardinality(v_track_ids) > 0 THEN
    DELETE FROM public.template_cues
    WHERE template_track_id = ANY(v_track_ids);
  END IF;

  DELETE FROM public.template_tracks
  WHERE event_template_id = p_event_template_id;

  INSERT INTO public.template_tracks (id, event_template_id, name, color_id, sort_order)
  SELECT
    track.id,
    p_event_template_id,
    track.name,
    colors.id,
    track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key;

  INSERT INTO public.template_cues (id, template_track_id, label, start, duration, type, assignee, notes)
  SELECT
    cue.id,
    (track.value->>'id')::uuid,
    cue.label,
    cue.start,
    cue.duration,
    cue.type,
    cue.assignee,
    cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    assignee text,
    notes text
  );
END;
$$;

-- 5. save_event_tracks
CREATE OR REPLACE FUNCTION public.save_event_tracks(
  p_event_id uuid,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_track_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(id), '{}')
  INTO v_track_ids
  FROM public.tracks
  WHERE event_id = p_event_id;

  IF cardinality(v_track_ids) > 0 THEN
    DELETE FROM public.cues
    WHERE track_id = ANY(v_track_ids);
  END IF;

  DELETE FROM public.tracks
  WHERE event_id = p_event_id;

  INSERT INTO public.tracks (id, event_id, name, color_id, sort_order)
  SELECT
    track.id,
    p_event_id,
    track.name,
    colors.id,
    track.sort_order
  FROM jsonb_to_recordset(coalesce(p_tracks, '[]'::jsonb)) AS track(
    id uuid,
    name text,
    color_key text,
    sort_order integer,
    cues jsonb
  )
  JOIN public.colors ON colors.key = track.color_key;

  INSERT INTO public.cues (id, track_id, label, start, duration, type, assignee, notes)
  SELECT
    cue.id,
    (track.value->>'id')::uuid,
    cue.label,
    cue.start,
    cue.duration,
    cue.type,
    cue.assignee,
    cue.notes
  FROM jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) AS track(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(track.value->'cues', '[]'::jsonb)) AS cue(
    id uuid,
    label text,
    start integer,
    duration integer,
    type public.cue_type,
    assignee text,
    notes text
  );
END;
$$;

-- 6. save_template_checklist_structure
-- Drop both possible signatures first so PostgREST/Supabase schema cache
-- doesn't keep resolving an older parameter order.
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
BEGIN
  DELETE FROM public.template_items
  WHERE checklist_template_id = p_checklist_template_id;

  DELETE FROM public.template_sections
  WHERE checklist_template_id = p_checklist_template_id;

  INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order)
  SELECT
    section.id,
    p_checklist_template_id,
    section.name,
    section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  );

  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT
    item.id,
    p_checklist_template_id,
    NULL,
    item.label,
    item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  );

  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT
    item.id,
    p_checklist_template_id,
    (section.value->>'id')::uuid,
    item.label,
    item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  );
END;
$$;

-- 7. save_checklist_structure
-- Drop both possible signatures first so PostgREST/Supabase schema cache
-- doesn't keep resolving an older parameter order.
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
BEGIN
  DELETE FROM public.checklist_items
  WHERE checklist_id = p_checklist_id;

  DELETE FROM public.checklist_sections
  WHERE checklist_id = p_checklist_id;

  INSERT INTO public.checklist_sections (id, checklist_id, name, sort_order)
  SELECT
    section.id,
    p_checklist_id,
    section.name,
    section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  );

  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT
    item.id,
    p_checklist_id,
    NULL,
    item.label,
    item.checked,
    item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  );

  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT
    item.id,
    p_checklist_id,
    (section.value->>'id')::uuid,
    item.label,
    item.checked,
    item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  );
END;
$$;
