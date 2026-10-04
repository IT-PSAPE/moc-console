import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'
import { syncTelegramGroupCommands } from '../telegram-command-menu.js'

export async function syncManagementCommands(workspaceId?:string,userId?:string): Promise<{failed: number}> {
  const groups=await queryRows<QueryResultRow & { chat_id: string; workspace_id: string }>(
    'SELECT chat_id,workspace_id FROM public.telegram_groups WHERE active AND removed_at IS NULL AND ($1::uuid IS NULL OR workspace_id=$1)',[workspaceId??null],
  )
  let failed=0
  for(const group of groups) {
    failed += (await syncTelegramGroupCommands(group.chat_id, group.workspace_id, userId)).failed
  }
  return {failed}
}
