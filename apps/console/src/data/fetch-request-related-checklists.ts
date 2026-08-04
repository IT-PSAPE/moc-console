import { supabase } from "@moc/data/supabase";

export type RequestRelatedChecklist = {
  id: string;
  name: string;
  completedItems: number;
  totalItems: number;
};

type ChecklistItemRow = {
  checked: boolean;
};

type ChecklistRow = {
  id: string;
  name: string;
  checklist_items: ChecklistItemRow[] | null;
};

function mapChecklist(row: ChecklistRow): RequestRelatedChecklist {
  const items = row.checklist_items ?? [];
  return {
    id: row.id,
    name: row.name,
    completedItems: items.filter((item) => item.checked).length,
    totalItems: items.length,
  };
}

export async function fetchRequestRelatedChecklists(workspaceId: string, requestId: string): Promise<RequestRelatedChecklist[]> {
  const { data, error } = await supabase
    .from("checklists")
    .select("id, name, checklist_items(checked)")
    .eq("workspace_id", workspaceId)
    .eq("request_id", requestId)
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ChecklistRow[]).map(mapChecklist);
}
