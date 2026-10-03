import { getSupabaseAdmin } from '../supabase-admin.js'
import { syncTelegramGroupCommands } from '../telegram-command-menu.js'

export async function syncManagementCommands(workspaceId?:string,userId?:string): Promise<{failed: number}> {
  const admin=getSupabaseAdmin()
  let groupQuery=admin.from('telegram_groups').select('chat_id,workspace_id').eq('active',true).is('removed_at',null)
  if(workspaceId) groupQuery=groupQuery.eq('workspace_id',workspaceId)
  const {data:groups,error}=await groupQuery
  if(error) throw new Error(error.message)
  let failed=0
  for(const group of groups??[]) {
    failed += (await syncTelegramGroupCommands(group.chat_id, group.workspace_id, userId)).failed
  }
  return {failed}
}
