-- Restore Checklists as a standalone Console feature after the
-- 2026-07-28 Cue Sheet removal patch dropped its persistence layer.
BEGIN;

-- checklist_templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- template_sections
CREATE TABLE IF NOT EXISTS public.template_sections (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid    NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  name                  text    NOT NULL,
  sort_order            integer NOT NULL
);

-- template_items
CREATE TABLE IF NOT EXISTS public.template_items (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid    NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  template_section_id   uuid    NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  label                 text    NOT NULL,
  sort_order            integer NOT NULL
);

-- checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- checklist_sections
CREATE TABLE IF NOT EXISTS public.checklist_sections (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid    NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  name         text    NOT NULL,
  sort_order   integer NOT NULL
);

-- checklist_items
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid    NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  section_id   uuid    NULL REFERENCES public.checklist_sections(id) ON DELETE CASCADE,
  label        text    NOT NULL,
  checked      boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL
);

-- checklist_item_assignees (phase-25 junction table) — after checklist_items + users
CREATE TABLE IF NOT EXISTS public.checklist_item_assignees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duty              text NOT NULL,
  UNIQUE (checklist_item_id, user_id, duty)
);

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

-- checklist_item_assignees (phase-25)
CREATE INDEX IF NOT EXISTS idx_checklist_item_assignees_item_user ON public.checklist_item_assignees (checklist_item_id, user_id);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_assignees ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON public.checklist_templates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.checklists;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- create_checklist_from_template (phase-10)
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
  SELECT id, workspace_id, name, description
  INTO v_template
  FROM public.checklist_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Checklist template "%" not found.', p_template_id;
  END IF;

  INSERT INTO public.checklists (workspace_id, name, description, scheduled_at)
  VALUES (
    v_template.workspace_id,
    coalesce(p_name, v_template.name),
    coalesce(p_description, v_template.description),
    p_scheduled_at
  )
  RETURNING id INTO v_checklist_id;

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

-- save_template_checklist_structure (phase-25 upsert-by-id FINAL version)
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

-- save_checklist_structure (phase-25 upsert-by-id FINAL version)
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

COMMIT;
