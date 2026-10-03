import { getSupabaseAdmin } from '../supabase-admin.js'
import { setTelegramManagementCommands } from '../telegram.js'

export async function syncManagementCommands(workspaceId?:string,userId?:string): Promise<{failed: number}> {
  const admin=getSupabaseAdmin()
  let groupQuery=admin.from('telegram_groups').select('chat_id,workspace_id').eq('active',true).is('removed_at',null)
  if(workspaceId) groupQuery=groupQuery.eq('workspace_id',workspaceId)
  const {data:groups,error}=await groupQuery
  if(error) throw new Error(error.message)
  let failed=0
  for(const group of groups??[]) {
    let memberQuery=admin.from('workspace_users').select('users(telegram_chat_id),roles(can_update)').eq('workspace_id',group.workspace_id)
    if(userId) memberQuery=memberQuery.eq('user_id',userId)
    const {data:members,error:memberError}=await memberQuery
    if(memberError) throw new Error(memberError.message)
    for(const member of members??[]) {
      const user=Array.isArray(member.users)?member.users[0]:member.users
      const role=Array.isArray(member.roles)?member.roles[0]:member.roles
      if(!user?.telegram_chat_id) continue
      const result=await setTelegramManagementCommands(group.chat_id,user.telegram_chat_id,role?.can_update===true)
      if(!result.ok) failed++
    }
  }
  return {failed}
}
