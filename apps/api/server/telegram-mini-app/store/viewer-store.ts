import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type LinkedViewer = { userId: string; name: string }

export async function findViewerByTelegramId(telegramUserId: string): Promise<LinkedViewer | null> {
  const [row] = await queryRows<QueryResultRow & { id: string; name: string; surname: string }>(
    'SELECT id,name,surname FROM public.users WHERE telegram_chat_id=$1',[telegramUserId],
  )
  if (!row) return null
  return { userId: row.id, name: `${row.name} ${row.surname}`.trim() }
}

export type WorkspacePermissions = { canRead: boolean; canUpdate: boolean }

export async function loadWorkspacePermissions(workspaceId: string, userId: string): Promise<WorkspacePermissions | null> {
  const [row] = await queryRows<QueryResultRow & { can_read: boolean; can_update: boolean }>(
    `SELECT r.can_read,r.can_update FROM public.workspace_users w JOIN public.roles r ON r.id=w.role_id
     WHERE w.workspace_id=$1 AND w.user_id=$2`,[workspaceId,userId],
  )
  return row ? { canRead: row.can_read, canUpdate: row.can_update } : null
}
