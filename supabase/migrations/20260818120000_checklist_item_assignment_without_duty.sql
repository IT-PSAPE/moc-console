-- Assigning a member to a checklist item is now a single action: pick the
-- member and they are assigned. The per-assignment `duty` label is retired for
-- checklist items only (request assignments keep theirs). Because duty was part
-- of the uniqueness key, one member could hold several rows on one item, so
-- those collapse to one before the narrower key can be enforced.

BEGIN;

-- Duty was the only thing distinguishing these rows, so the survivor is picked
-- arbitrarily (lowest id) — the table has no created_at to prefer.
DELETE FROM public.checklist_item_assignees AS duplicate
USING public.checklist_item_assignees AS survivor
WHERE duplicate.checklist_item_id = survivor.checklist_item_id
  AND duplicate.user_id = survivor.user_id
  AND duplicate.id > survivor.id;

-- Dropping the column also drops UNIQUE (checklist_item_id, user_id, duty),
-- which is why no explicit DROP CONSTRAINT is needed for the old key.
ALTER TABLE public.checklist_item_assignees
  DROP COLUMN IF EXISTS duty;

-- Named explicitly so a migrated database and a fresh phase-01 build agree on
-- the constraint name. The console upserts on this conflict target.
ALTER TABLE public.checklist_item_assignees
  DROP CONSTRAINT IF EXISTS checklist_item_assignees_checklist_item_id_user_id_key;
ALTER TABLE public.checklist_item_assignees
  ADD CONSTRAINT checklist_item_assignees_checklist_item_id_user_id_key
  UNIQUE (checklist_item_id, user_id);

-- The new constraint's backing index is identical to this one.
DROP INDEX IF EXISTS public.idx_checklist_item_assignees_item_user;

-- With duty gone the row has no payload left to edit, so the table is
-- insert/select/delete only. Keeping an UPDATE policy would leave a PostgREST
-- PATCH able to repoint an existing assignment at another member or item —
-- silently, because only the insert path announces an assignment.
DROP POLICY IF EXISTS "checklist_item_assignees_update" ON public.checklist_item_assignees;

-- Stored custom templates may still reference {{duty}}. At send time the line
-- disappears on its own (renderTemplate drops a line whose tokens all resolve
-- empty), but the settings editor refuses to save while an unknown placeholder
-- is present, so the stored bodies are scrubbed here. Request assignment
-- templates keep {{duty}} and must not match.
UPDATE public.notification_message_templates AS template
SET body = coalesce((
      SELECT string_agg(body_lines.line, E'\n' ORDER BY body_lines.ordinality)
      FROM unnest(string_to_array(template.body, E'\n'))
        WITH ORDINALITY AS body_lines(line, ordinality)
      WHERE body_lines.line NOT LIKE '%{{duty}}%'
         OR EXISTS (
              SELECT 1
              FROM regexp_matches(body_lines.line, '\{\{(\w+)\}\}', 'g') AS token(groups)
              WHERE token.groups[1] <> 'duty'
            )
    ), ''),
    updated_at = now()
WHERE template.scope = 'dm'
  AND template.message_type = 'assignment.checklist_item'
  AND template.body LIKE '%{{duty}}%';

-- A line that carried {{duty}} alongside other tokens survived above; only the
-- retired token goes. Residual blank lines are harmless — renderTemplate
-- collapses them.
UPDATE public.notification_message_templates
SET body = replace(body, '{{duty}}', ''),
    updated_at = now()
WHERE scope = 'dm'
  AND message_type = 'assignment.checklist_item'
  AND body LIKE '%{{duty}}%';

-- body is NOT NULL, and a blank body already renders as the built-in default
-- (resolveTemplate treats it as "no custom row"), so an emptied override is
-- dropped rather than left to fail on the next save.
DELETE FROM public.notification_message_templates
WHERE scope = 'dm'
  AND message_type = 'assignment.checklist_item'
  AND btrim(body) = '';

COMMIT;
