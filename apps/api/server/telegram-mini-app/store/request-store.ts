import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type RequestRecord = {
  id:string;workspaceId:string;title:string;trackingCode:string;status:string;priority:string;category:string;requestedBy:string;dueDate:string;
  who:string;what:string;whenText:string;whereText:string;why:string;how:string;notes:string|null
}
type RequestRow = QueryResultRow & {
  id:string;workspace_id:string;title:string;tracking_code:string;status:string;priority:string;category:string;requested_by:string;due_date:string;
  who:string;what:string;when_text:string;where_text:string;why:string;how:string;notes:string|null
}

export async function loadRequest(id: string): Promise<RequestRecord | null> {
  const [row] = await queryRows<RequestRow>(
    'SELECT id,workspace_id,title,tracking_code,status,priority,category,requested_by,due_date,who,what,when_text,where_text,why,how,notes FROM public.requests WHERE id=$1',[id],
  )
  if (!row) return null
  return {id:row.id,workspaceId:row.workspace_id,title:row.title,trackingCode:row.tracking_code,status:row.status,priority:row.priority,category:row.category,requestedBy:row.requested_by,dueDate:row.due_date,who:row.who,what:row.what,whenText:row.when_text,whereText:row.where_text,why:row.why,how:row.how,notes:row.notes}
}

export async function loadRequestCategoryName(workspaceId: string, key: string): Promise<string | null> {
  const [row] = await queryRows<QueryResultRow & { name: string }>(
    'SELECT name FROM public.request_categories WHERE workspace_id=$1 AND key=$2',[workspaceId,key],
  )
  return row?.name ?? null
}
