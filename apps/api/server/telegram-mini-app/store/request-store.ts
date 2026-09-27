import { getSupabaseAdmin } from "../../supabase-admin.js"

export type RequestRecord = {
  id: string
  workspaceId: string
  title: string
  trackingCode: string
  status: string
  priority: string
  category: string
  requestedBy: string
  dueDate: string
  who: string
  what: string
  whenText: string
  whereText: string
  why: string
  how: string
  notes: string | null
}

type RequestRow = {
  id: string
  workspace_id: string
  title: string
  tracking_code: string
  status: string
  priority: string
  category: string
  requested_by: string
  due_date: string
  who: string
  what: string
  when_text: string
  where_text: string
  why: string
  how: string
  notes: string | null
}

export async function loadRequest(id: string): Promise<RequestRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("requests")
    .select("id, workspace_id, title, tracking_code, status, priority, category, requested_by, due_date, who, what, when_text, where_text, why, how, notes")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error("Could not load the request")
  if (!data) return null

  const row = data as RequestRow
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    trackingCode: row.tracking_code,
    status: row.status,
    priority: row.priority,
    category: row.category,
    requestedBy: row.requested_by,
    dueDate: row.due_date,
    who: row.who,
    what: row.what,
    whenText: row.when_text,
    whereText: row.where_text,
    why: row.why,
    how: row.how,
    notes: row.notes,
  }
}

/** requests.category is a text FK to request_categories(workspace_id, key); resolve its display name. */
export async function loadRequestCategoryName(workspaceId: string, key: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("request_categories")
    .select("name")
    .eq("workspace_id", workspaceId)
    .eq("key", key)
    .maybeSingle()
  if (error) throw new Error("Could not load the request category")
  return (data?.name as string | undefined) ?? null
}
