BEGIN;
DO $$
DECLARE
  workspace uuid := (SELECT id FROM public.workspaces WHERE slug = 'default-workspace');
  template_id uuid := '30000000-0000-4000-8000-000000009001';
  historic_id uuid := '30000000-0000-4000-8000-000000009002';
  blank_id uuid := '30000000-0000-4000-8000-000000009003';
  template_run_id uuid;
  historic_date timestamptz := '2024-01-02T03:04:05Z';
BEGIN
  IF workspace IS NULL THEN RAISE EXCEPTION 'default workspace fixture missing'; END IF;

  INSERT INTO public.checklist_templates (id, workspace_id, name, description)
  VALUES (template_id, workspace, 'Template', 'Template description');
  INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order)
  VALUES
    ('30000000-0000-4000-8000-000000009011', template_id, 'Opening', 1),
    ('30000000-0000-4000-8000-000000009012', template_id, 'Closing', 2);
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  VALUES
    ('30000000-0000-4000-8000-000000009021', template_id, '30000000-0000-4000-8000-000000009011', 'Unlock', 1),
    ('30000000-0000-4000-8000-000000009022', template_id, '30000000-0000-4000-8000-000000009012', 'Lock', 1),
    ('30000000-0000-4000-8000-000000009023', template_id, NULL, 'Record handover', 1);

  INSERT INTO public.checklists (id, workspace_id, name, description, scheduled_at)
  VALUES (historic_id, workspace, 'Historical run', '', historic_date);
  INSERT INTO public.checklists (id, workspace_id, name, description, scheduled_at)
  VALUES (blank_id, workspace, 'Blank run', '', NULL);

  INSERT INTO public.checklists (id, workspace_id, name, description, scheduled_at, created_at)
  VALUES (historic_id, workspace, 'Historical run edited', '', NULL, now())
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      scheduled_at = COALESCE(EXCLUDED.scheduled_at, public.checklists.scheduled_at),
      updated_at = now();

  IF (SELECT scheduled_at FROM public.checklists WHERE id = historic_id) IS DISTINCT FROM historic_date THEN
    RAISE EXCEPTION 'content update cleared or changed historic schedule';
  END IF;
  IF (SELECT scheduled_at FROM public.checklists WHERE id = blank_id) IS NOT NULL THEN
    RAISE EXCEPTION 'blank run should be undated';
  END IF;

  template_run_id := public.create_checklist_from_template(template_id, NULL, 'Template run', '');
  IF (SELECT scheduled_at FROM public.checklists WHERE id = template_run_id) IS NOT NULL THEN
    RAISE EXCEPTION 'template run should be undated';
  END IF;
  IF (SELECT count(*) FROM public.checklist_sections WHERE checklist_id = template_run_id) <> 2 THEN
    RAISE EXCEPTION 'template run did not preserve its sections';
  END IF;
  IF (SELECT count(*) FROM public.checklist_items WHERE checklist_id = template_run_id) <> 3 THEN
    RAISE EXCEPTION 'template run did not preserve its items';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.checklist_items WHERE checklist_id = template_run_id AND label = 'Record handover' AND section_id IS NULL) THEN
    RAISE EXCEPTION 'template run did not preserve its top-level item';
  END IF;
END $$;
ROLLBACK;
