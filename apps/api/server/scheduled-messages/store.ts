import { getSupabaseAdmin } from '../supabase-admin.js'
import { requireWorkspacePermission } from '../workspace-access.js'
import type { AttendanceResponse, EditScope, Occurrence, Schedule } from './types.js'

export async function scheduledRpc(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await getSupabaseAdmin().rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}
export async function getOccurrence(id: string): Promise<Occurrence> {
  const { data, error } = await getSupabaseAdmin().from('scheduled_message_occurrences').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as Occurrence
}
export async function getSchedule(id: string): Promise<Schedule> {
  const { data, error } = await getSupabaseAdmin().from('scheduled_message_schedules').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as Schedule
}
export async function getResponses(id: string): Promise<AttendanceResponse[]> {
  const { data, error } = await getSupabaseAdmin().from('scheduled_message_responses').select('user_id,name,status,arrival_time,group_id').eq('occurrence_id', id).order('name')
  if (error) throw new Error(error.message)
  return data as AttendanceResponse[]
}
export function assertActive(o: Occurrence): void {
  if (Date.parse(o.expires_at) <= Date.now() || ['cancelled','unknown','sending'].includes(o.state)) throw new Error('Message is no longer actionable. Reopen the management flow.')
}
export async function listActive(workspaceId: string, chatId?: string): Promise<Occurrence[]> {
  await scheduledRpc('materialize_scheduled_messages')
  const admin = getSupabaseAdmin()
  let schedules = admin.from('scheduled_message_schedules').select('id').eq('workspace_id', workspaceId)
  if (chatId) schedules = schedules.eq('group_chat_id',chatId)
  const { data: selected, error: scheduleError } = await schedules
  if (scheduleError) throw new Error(scheduleError.message)
  const ids = (selected ?? []).map(row => row.id as string)
  if (!ids.length) return []
  const { data, error } = await admin.from('scheduled_message_occurrences').select('*').eq('workspace_id',workspaceId).in('schedule_id', ids).gt('expires_at',new Date().toISOString()).neq('state','cancelled').order('send_on').limit(500)
  if (error) throw new Error(error.message)
  return data as Occurrence[]
}
export async function changeOccurrence(actor: string, id: string, revision: number, field: string, value: string, scope: EditScope): Promise<void> {
  await scheduledRpc('change_scheduled_occurrence',{p_actor:actor,p_id:id,p_revision:revision,p_field:field,p_value:value,p_scope:scope})
}
export async function sendOccurrence(actor: string,id: string): Promise<void> {
  await scheduledRpc('request_scheduled_send',{p_actor:actor,p_id:id})
}
export async function resendOccurrence(actor: string,id: string,revision: number): Promise<void> {
  await scheduledRpc('request_scheduled_resend',{p_actor:actor,p_id:id,p_revision:revision})
}
export async function deleteOccurrence(actor: string,id: string,revision: number,scope: EditScope): Promise<string[]> {
  return await scheduledRpc('delete_scheduled_occurrence',{p_actor:actor,p_id:id,p_revision:revision,p_scope:scope}) as string[]
}
export async function respondAttendance(actor: string,o: Occurrence,status: 'attending'|'not_attending',arrival: string|null,groupId: string|null): Promise<void> {
  await scheduledRpc('respond_scheduled_attendance',{p_actor:actor,p_id:o.id,p_revision:o.revision,p_status:status,p_arrival:arrival,p_group:groupId})
}
export async function linkedUser(telegramId: string): Promise<string> {
  const { data,error }=await getSupabaseAdmin().from('users').select('id').eq('telegram_chat_id',telegramId).single()
  if(error || !data) throw new Error('Link your Telegram account in MOC Console first.')
  return data.id as string
}
export async function groupWorkspace(chatId: string): Promise<string> {
  const {data,error}=await getSupabaseAdmin().from('telegram_groups').select('workspace_id').eq('chat_id',chatId).eq('active',true).is('removed_at',null).single()
  if(error || !data) throw new Error('This group is not active in MOC Console.')
  return data.workspace_id as string
}
export async function authorizeManagement(actor: string,workspaceId: string): Promise<void> {
  await requireWorkspacePermission(actor,workspaceId,'can_update')
}
