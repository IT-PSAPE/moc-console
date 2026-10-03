import { supabase } from '@moc/data/supabase'
import type { MemberType } from '@moc/notifications'
export async function fetchMemberTypes(workspaceId:string):Promise<MemberType[]> {
  const {data,error}=await supabase.from('workspace_member_types').select('id,name,is_default').eq('workspace_id',workspaceId).order('name')
  if(error) throw new Error(error.message)
  return data as MemberType[]
}
export async function saveMemberType(workspaceId:string,name:string,id:string|null):Promise<void> {
  const query=id?supabase.from('workspace_member_types').update({name}).eq('id',id).eq('workspace_id',workspaceId):supabase.from('workspace_member_types').insert({name,workspace_id:workspaceId})
  const {error}=await query
  if(error) throw new Error(error.message)
}
export async function assignMemberType(workspaceId:string,userId:string,typeId:string):Promise<void> {
  const {error}=await supabase.rpc('set_workspace_member_type',{p_workspace_id:workspaceId,p_user_id:userId,p_type_id:typeId})
  if(error) throw new Error(error.message)
}
