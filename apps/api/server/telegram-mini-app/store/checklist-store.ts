import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type ChecklistItemRecord = { id: string; sectionId: string | null; label: string; checked: boolean; sortOrder: number; assigneeNames: string[] }
export type ChecklistSectionRecord = { id: string; name: string; sortOrder: number }
export type ChecklistRecord = { id: string; workspaceId: string; name: string; description: string; scheduledAt: string; sections: ChecklistSectionRecord[]; items: ChecklistItemRecord[] }

type ChecklistRow = QueryResultRow & { id: string; workspace_id: string; name: string; description: string; scheduled_at: string }
type SectionRow = QueryResultRow & { id: string; name: string; sort_order: number }
type ItemRow = QueryResultRow & { id: string; section_id: string | null; label: string; checked: boolean; sort_order: number; assignee_names: string[] }

export async function loadChecklist(id: string): Promise<ChecklistRecord | null> {
  const [row] = await queryRows<ChecklistRow>('SELECT id,workspace_id,name,description,scheduled_at FROM public.checklists WHERE id=$1',[id])
  if (!row) return null
  const [sections,items] = await Promise.all([
    queryRows<SectionRow>('SELECT id,name,sort_order FROM public.checklist_sections WHERE checklist_id=$1 ORDER BY sort_order',[id]),
    queryRows<ItemRow>(
      `SELECT i.id,i.section_id,i.label,i.checked,i.sort_order,coalesce(array_agg(trim(concat_ws(' ',u.name,u.surname))) FILTER (WHERE u.id IS NOT NULL),'{}') AS assignee_names
       FROM public.checklist_items i LEFT JOIN public.checklist_item_assignees a ON a.checklist_item_id=i.id
       LEFT JOIN public.users u ON u.id=a.user_id WHERE i.checklist_id=$1 GROUP BY i.id ORDER BY i.sort_order`,[id],
    ),
  ])
  return {
    id:row.id,workspaceId:row.workspace_id,name:row.name,description:row.description,scheduledAt:row.scheduled_at,
    sections:sections.map(section=>({id:section.id,name:section.name,sortOrder:section.sort_order})),
    items:items.map(item=>({id:item.id,sectionId:item.section_id,label:item.label,checked:item.checked,sortOrder:item.sort_order,assigneeNames:item.assignee_names})),
  }
}

export async function setChecklistItemChecked(itemId: string, checked: boolean): Promise<void> {
  await queryRows('UPDATE public.checklist_items SET checked=$2 WHERE id=$1',[itemId,checked])
}
