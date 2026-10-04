import type { Checklist, ChecklistItem, ChecklistSection } from "@moc/types/checklists"
import type { PlatformOperation } from "./context.js"
import { objectInput, optionalStringField, optionalUuidField, PlatformInputError, stringField, uuidField } from "./input.js"

type DbTimestamp = string | Date
type HeaderRow = { id: string; workspace_id: string; name: string; description: string; created_at: DbTimestamp; updated_at: DbTimestamp; scheduled_at?: DbTimestamp; request_id?: string | null }
type SectionRow = { id: string; checklist_id?: string; checklist_template_id?: string; name: string; sort_order: number }
type ItemRow = { id: string; checklist_id?: string; checklist_template_id?: string; section_id?: string | null; template_section_id?: string | null; label: string; checked?: boolean; sort_order: number }
type RelatedRow = { id: string; name: string; completed_items: number; total_items: number }

function isoTimestamp(value: DbTimestamp | undefined): string | undefined {
  return value instanceof Date ? value.toISOString() : value
}

function mapChecklist(header: HeaderRow, sections: SectionRow[], items: ItemRow[], kind: Checklist["kind"]): Checklist {
  const template = kind === "template"
  const filteredSections = sections.filter((row) => (template ? row.checklist_template_id : row.checklist_id) === header.id)
  const filteredItems = items.filter((row) => (template ? row.checklist_template_id : row.checklist_id) === header.id)
  const bySection = (sectionId: string | null) => filteredItems
    .filter((row) => (template ? row.template_section_id ?? null : row.section_id ?? null) === sectionId)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((row): ChecklistItem => ({ id: row.id, label: row.label, checked: template ? false : row.checked ?? false }))
  const mappedSections: ChecklistSection[] = filteredSections
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((row) => ({ id: row.id, name: row.name, items: bySection(row.id) }))
  return {
    id: header.id, kind, name: header.name, description: header.description,
    ...(template ? {} : { scheduledAt: isoTimestamp(header.scheduled_at), requestId: header.request_id ?? undefined }),
    items: bySection(null), sections: mappedSections, createdAt: isoTimestamp(header.created_at) ?? "", updatedAt: isoTimestamp(header.updated_at) ?? "",
  }
}

async function loadOne(db: Parameters<PlatformOperation["run"]>[0]["db"], workspaceId: string, id: string): Promise<Checklist | undefined> {
  const templateResult = await db.query<HeaderRow>(`SELECT id,workspace_id,name,description,created_at,updated_at
    FROM checklist_templates WHERE workspace_id=$1 AND id=$2`, [workspaceId, id])
  if (templateResult.rows[0]) {
    const [sections, items] = await Promise.all([
      db.query<SectionRow>("SELECT id, checklist_template_id, name, sort_order FROM template_sections WHERE checklist_template_id=$1", [id]),
      db.query<ItemRow>("SELECT id, checklist_template_id, template_section_id, label, sort_order FROM template_items WHERE checklist_template_id=$1", [id]),
    ])
    return mapChecklist(templateResult.rows[0], sections.rows, items.rows, "template")
  }
  const runResult = await db.query<HeaderRow>(`SELECT id,workspace_id,name,description,scheduled_at,request_id,created_at,updated_at
    FROM checklists WHERE workspace_id=$1 AND id=$2`, [workspaceId, id])
  if (!runResult.rows[0]) return undefined
  const [sections, items] = await Promise.all([
    db.query<SectionRow>("SELECT id, checklist_id, name, sort_order FROM checklist_sections WHERE checklist_id=$1", [id]),
    db.query<ItemRow>("SELECT id, checklist_id, section_id, label, checked, sort_order FROM checklist_items WHERE checklist_id=$1", [id]),
  ])
  return mapChecklist(runResult.rows[0], sections.rows, items.rows, "instance")
}

async function loadAll(db: Parameters<PlatformOperation["run"]>[0]["db"], workspaceId: string): Promise<Checklist[]> {
  const [templates, runs] = await Promise.all([
    db.query<HeaderRow>("SELECT id,workspace_id,name,description,created_at,updated_at FROM checklist_templates WHERE workspace_id=$1 ORDER BY created_at DESC", [workspaceId]),
    db.query<HeaderRow>("SELECT id,workspace_id,name,description,scheduled_at,request_id,created_at,updated_at FROM checklists WHERE workspace_id=$1 ORDER BY scheduled_at ASC", [workspaceId]),
  ])
  const templateIds = templates.rows.map((row) => row.id)
  const runIds = runs.rows.map((row) => row.id)
  const [templateSections, templateItems, runSections, runItems] = await Promise.all([
    templateIds.length ? db.query<SectionRow>("SELECT id,checklist_template_id,name,sort_order FROM template_sections WHERE checklist_template_id=ANY($1::uuid[])", [templateIds]) : { rows: [] as SectionRow[] },
    templateIds.length ? db.query<ItemRow>("SELECT id,checklist_template_id,template_section_id,label,sort_order FROM template_items WHERE checklist_template_id=ANY($1::uuid[])", [templateIds]) : { rows: [] as ItemRow[] },
    runIds.length ? db.query<SectionRow>("SELECT id,checklist_id,name,sort_order FROM checklist_sections WHERE checklist_id=ANY($1::uuid[])", [runIds]) : { rows: [] as SectionRow[] },
    runIds.length ? db.query<ItemRow>("SELECT id,checklist_id,section_id,label,checked,sort_order FROM checklist_items WHERE checklist_id=ANY($1::uuid[])", [runIds]) : { rows: [] as ItemRow[] },
  ])
  return [
    ...templates.rows.map((row) => mapChecklist(row, templateSections.rows, templateItems.rows, "template")),
    ...runs.rows.map((row) => mapChecklist(row, runSections.rows, runItems.rows, "instance")),
  ]
}

function parseChecklist(value: unknown): Checklist {
  const input = objectInput(value, ["id", "kind", "templateId", "name", "description", "scheduledAt", "requestId", "items", "sections", "createdAt", "updatedAt"])
  if (input.kind !== "template" && input.kind !== "instance") throw new PlatformInputError("Invalid checklist kind")
  if (!Array.isArray(input.items) || !Array.isArray(input.sections)) throw new PlatformInputError("Invalid checklist structure")
  const parseItems = (value: unknown): ChecklistItem[] => {
    if (!Array.isArray(value)) throw new PlatformInputError("Invalid checklist items")
    return value.map((entry) => {
      const item = objectInput(entry, ["id", "label", "checked"])
      if (typeof item.checked !== "boolean") throw new PlatformInputError("Invalid checklist item")
      return { id: uuidField(item, "id"), label: stringField(item, "label"), checked: item.checked }
    })
  }
  const sections = input.sections.map((entry): ChecklistSection => {
    const section = objectInput(entry, ["id", "name", "items"])
    return { id: uuidField(section, "id"), name: stringField(section, "name"), items: parseItems(section.items) }
  })
  return {
    id: uuidField(input, "id"), kind: input.kind, templateId: optionalUuidField(input, "templateId"),
    name: stringField(input, "name"), description: stringField(input, "description"),
    scheduledAt: optionalStringField(input, "scheduledAt"), requestId: optionalUuidField(input, "requestId"),
    items: parseItems(input.items), sections, createdAt: stringField(input, "createdAt"), updatedAt: stringField(input, "updatedAt"),
  }
}

function toRpcStructure(checklist: Checklist): Record<string, unknown> {
  return {
    items: checklist.items.map((item, index) => ({ id: item.id, label: item.label, checked: checklist.kind === "instance" && item.checked, sort_order: index + 1 })),
    sections: checklist.sections.map((section, sectionIndex) => ({
      id: section.id, name: section.name, sort_order: sectionIndex + 1,
      items: section.items.map((item, itemIndex) => ({ id: item.id, label: item.label, checked: checklist.kind === "instance" && item.checked, sort_order: itemIndex + 1 })),
    })),
  }
}

export const operations: Record<string, PlatformOperation> = {
  list: { permission: "can_read", run: async ({ db, workspaceId }) => loadAll(db, workspaceId) },
  getById: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id", "workspaceId"])
    return loadOne(db, workspaceId, uuidField(input, "id"))
  } },
  getRelatedToRequest: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["workspaceId", "requestId"])
    const result = await db.query<RelatedRow>(`SELECT checklist.id, checklist.name,
      count(item.id) FILTER (WHERE item.checked) AS completed_items, count(item.id) AS total_items
      FROM checklists AS checklist LEFT JOIN checklist_items AS item ON item.checklist_id=checklist.id
      WHERE checklist.workspace_id=$1 AND checklist.request_id=$2
      GROUP BY checklist.id ORDER BY checklist.scheduled_at ASC`, [workspaceId, uuidField(input, "requestId")])
    return result.rows.map((row) => ({ id: row.id, name: row.name, completedItems: Number(row.completed_items), totalItems: Number(row.total_items) }))
  } },
  save: { permission: "can_write", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["checklist"])
    const checklist = parseChecklist(input.checklist)
    if (checklist.kind === "template") {
      const result = await db.query<{ id: string }>(`INSERT INTO checklist_templates (id,workspace_id,name,description,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,updated_at=now()
        WHERE checklist_templates.workspace_id=$2 RETURNING id`, [checklist.id, workspaceId, checklist.name, checklist.description, checklist.createdAt])
      if (!result.rows[0]) throw new Error("Checklist not found")
      await db.query("SELECT public.save_template_checklist_structure($1::uuid,$2::jsonb)", [checklist.id, JSON.stringify(toRpcStructure(checklist))])
    } else {
      if (checklist.requestId) {
        const request = await db.query<{ id: string }>("SELECT id FROM requests WHERE workspace_id=$1 AND id=$2 FOR SHARE", [workspaceId, checklist.requestId])
        if (!request.rows[0]) throw new Error("Request not found")
      }
      const result = await db.query<{ id: string }>(`INSERT INTO checklists (id,workspace_id,name,description,scheduled_at,request_id,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
        scheduled_at=EXCLUDED.scheduled_at,request_id=EXCLUDED.request_id,updated_at=now() WHERE checklists.workspace_id=$2 RETURNING id`,
        [checklist.id, workspaceId, checklist.name, checklist.description, checklist.scheduledAt ?? new Date().toISOString(), checklist.requestId ?? null, checklist.createdAt])
      if (!result.rows[0]) throw new Error("Checklist not found")
      await db.query("SELECT public.save_checklist_structure($1::uuid,$2::jsonb)", [checklist.id, JSON.stringify(toRpcStructure(checklist))])
    }
    const saved = await loadOne(db, workspaceId, checklist.id)
    if (!saved) throw new Error("Saved checklist could not be reloaded")
    return saved
  } },
  delete: { permission: "can_delete", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id"])
    const id = uuidField(input, "id")
    await db.query("DELETE FROM checklist_templates WHERE workspace_id=$1 AND id=$2", [workspaceId, id])
    await db.query("DELETE FROM checklists WHERE workspace_id=$1 AND id=$2", [workspaceId, id])
    return null
  } },
  createFromTemplate: { permission: "can_create", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["templateId", "overrides"])
    const templateId = uuidField(input, "templateId")
    const overrides = objectInput(input.overrides, ["name", "description", "scheduledAt"])
    const scheduledAt = optionalStringField(overrides, "scheduledAt")
    const template = await db.query<{ id: string }>("SELECT id FROM checklist_templates WHERE workspace_id=$1 AND id=$2 FOR SHARE", [workspaceId, templateId])
    if (!template.rows[0]) throw new Error("Checklist template not found")
    const result = await db.query<{ id: string }>("SELECT public.create_checklist_from_template($1::uuid,$2::timestamptz,$3::text,$4::text) AS id",
      [templateId, scheduledAt ?? new Date().toISOString(), optionalStringField(overrides, "name") ?? null, optionalStringField(overrides, "description") ?? null])
    if (!result.rows[0]) throw new Error("Checklist template not found")
    return result.rows[0].id
  } },
  addAssignee: { permission: "can_create", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["itemId", "userId"])
    const result = await db.query<{ id: string }>(`INSERT INTO checklist_item_assignees (checklist_item_id,user_id)
      SELECT item.id,$3 FROM checklist_items AS item JOIN checklists AS checklist ON checklist.id=item.checklist_id
      WHERE checklist.workspace_id=$1 AND item.id=$2 AND EXISTS (
        SELECT 1 FROM workspace_users AS member WHERE member.workspace_id=$1 AND member.user_id=$3)
      ON CONFLICT (checklist_item_id,user_id) DO NOTHING RETURNING id`, [workspaceId, uuidField(input, "itemId"), uuidField(input, "userId")])
    return result.rows.length > 0
  } },
  removeAssignee: { permission: "can_delete", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["itemId", "userId"])
    await db.query(`DELETE FROM checklist_item_assignees AS assignment USING checklist_items AS item, checklists AS checklist
      WHERE assignment.checklist_item_id=item.id AND item.checklist_id=checklist.id AND checklist.workspace_id=$1
      AND item.id=$2 AND assignment.user_id=$3`, [workspaceId, uuidField(input, "itemId"), uuidField(input, "userId")])
    return null
  } },
}
