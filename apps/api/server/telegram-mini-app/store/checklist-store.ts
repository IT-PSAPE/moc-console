import { getSupabaseAdmin } from "../../supabase-admin.js"

export type ChecklistItemRecord = {
  id: string
  sectionId: string | null
  label: string
  checked: boolean
  sortOrder: number
  assigneeNames: string[]
}

export type ChecklistSectionRecord = { id: string; name: string; sortOrder: number }

export type ChecklistRecord = {
  id: string
  workspaceId: string
  name: string
  description: string
  scheduledAt: string
  sections: ChecklistSectionRecord[]
  items: ChecklistItemRecord[]
}

type AssigneeRow = { users: { name: string; surname: string } | null }

type ItemRow = {
  id: string
  section_id: string | null
  label: string
  checked: boolean
  sort_order: number
  checklist_item_assignees: AssigneeRow[] | null
}

type ChecklistRow = {
  id: string
  workspace_id: string
  name: string
  description: string
  scheduled_at: string
  checklist_sections: { id: string; name: string; sort_order: number }[] | null
  checklist_items: ItemRow[] | null
}

export async function loadChecklist(id: string): Promise<ChecklistRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("checklists")
    .select("id, workspace_id, name, description, scheduled_at, checklist_sections ( id, name, sort_order ), checklist_items ( id, section_id, label, checked, sort_order, checklist_item_assignees ( users ( name, surname ) ) )")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error("Could not load the checklist")
  if (!data) return null

  const row = data as unknown as ChecklistRow
  const items: ChecklistItemRecord[] = (row.checklist_items ?? []).map((item) => {
    const assignees = item.checklist_item_assignees ?? []
    return {
      id: item.id,
      sectionId: item.section_id,
      label: item.label,
      checked: item.checked,
      sortOrder: item.sort_order,
      assigneeNames: assignees
        .map((assignee) => (assignee.users ? `${assignee.users.name} ${assignee.users.surname}`.trim() : null))
        .filter((name): name is string => Boolean(name)),
    }
  })

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    scheduledAt: row.scheduled_at,
    sections: (row.checklist_sections ?? []).map((section) => ({ id: section.id, name: section.name, sortOrder: section.sort_order })),
    items,
  }
}

export async function setChecklistItemChecked(itemId: string, checked: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin().from("checklist_items").update({ checked }).eq("id", itemId)
  if (error) throw new Error("Could not update the checklist item")
}
