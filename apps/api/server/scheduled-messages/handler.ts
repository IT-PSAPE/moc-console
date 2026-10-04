import { validateScheduledBody, validateScheduledFields, validateScheduledAttendanceGroups, type ScheduledMessageType } from '@moc/notifications'
import { requireAuthenticatedUser, AuthError } from '../auth-guard.js'
import { applyCors, isAllowedOrigin } from '../cors.js'
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse } from '../http.js'
import { getSupabaseAdmin } from '../supabase-admin.js'
import { WorkspaceAccessError } from '../workspace-access.js'
import { authorizeManagement, changeOccurrence, getOccurrence, listActive, scheduledRpc, sendOccurrence, resendOccurrence } from './store.js'
import { syncOccurrence, syncWorkspace } from './worker.js'
import { syncManagementCommands } from './commands.js'
import type { EditScope } from './types.js'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request')
  return value as Record<string, unknown>
}
function string(value: unknown): string {
  if(typeof value!=='string' || !value.length) throw new Error('Missing required value')
  return value
}
function uuid(value: unknown): string {
  const id=string(value)
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid ID')
  return id
}
async function snapshot(workspace: string): Promise<unknown> {
  const admin=getSupabaseAdmin()
  const occurrences=await listActive(workspace)
  const results=await Promise.all([
    admin.from('scheduled_message_templates').select('*').eq('workspace_id',workspace).is('deleted_at',null).order('name'),
    admin.from('scheduled_message_schedules').select('*').eq('workspace_id',workspace),
    admin.from('workspace_member_types').select('*').eq('workspace_id',workspace).order('name'),
    admin.from('telegram_groups').select('chat_id,title,telegram_group_topics(thread_id,name,closed)').eq('workspace_id',workspace).eq('active',true).is('removed_at',null),
    admin.from('workspace_users').select('user_id,member_type_id,users!inner(name,surname)').eq('workspace_id',workspace),
  ])
  for(const r of results) if(r.error) throw new Error(r.error.message)
  type MemberRow = {user_id:string;member_type_id:string;users:{name:string;surname:string}|{name:string;surname:string}[]|null}
  const members=((results[4].data ?? []) as unknown as MemberRow[]).flatMap(row => {
    const user=Array.isArray(row.users)?row.users[0]:row.users
    return user?[{id:row.user_id,memberTypeId:row.member_type_id,name:`${user.name} ${user.surname}`.trim()}]:[]
  })
  return {occurrences,templates:results[0].data,schedules:results[1].data,memberTypes:results[2].data,groups:results[3].data,members}
}
async function mutate(actor: string,workspace: string,body: Record<string,unknown>): Promise<void> {
  const data=object(body.data)
  if(body.op==='template.save') {
    if(data.id!==undefined) uuid(data.id)
    if(data.creationId!==undefined) uuid(data.creationId)
    const messageType=string(data.messageType) as ScheduledMessageType
    if(!['announcement','pre_attendance'].includes(messageType)) throw new Error('Invalid message type')
    validateScheduledFields(messageType,data.fields)
    validateScheduledBody(messageType,string(data.body))
    const attendanceGroups=validateScheduledAttendanceGroups(messageType,data.attendanceGroups??[])
    await scheduledRpc('save_scheduled_template',{p_actor:actor,p_workspace:workspace,p_data:{...data,attendanceGroups}})
  } else if(body.op==='template.delete') {
    await scheduledRpc('delete_scheduled_template',{p_actor:actor,p_workspace:workspace,p_id:uuid(data.id)})
  } else if(body.op==='schedule.create') {
    uuid(data.templateId)
    await scheduledRpc('create_scheduled_schedule',{p_actor:actor,p_workspace:workspace,p_data:data})
  } else if(body.op==='commands.sync') {
    const result=await syncManagementCommands(workspace)
    if(result.failed) throw new Error(`Telegram could not update ${result.failed} command menus. The daily worker will retry.`)
  } else {
    const id=uuid(data.id)
    const occurrence=await getOccurrence(id)
    if(occurrence.workspace_id!==workspace) throw new WorkspaceAccessError('Message belongs to another workspace')
    if(body.op==='occurrence.send') await sendOccurrence(actor,id)
    else if(body.op==='occurrence.resend') {
      if(!Number.isInteger(data.revision)) throw new Error('Invalid revision')
      await resendOccurrence(actor,id,data.revision as number)
    }
    else if(body.op==='occurrence.edit') {
      if(!Number.isInteger(data.revision)) throw new Error('Invalid revision')
      const scope=string(data.scope) as EditScope
      if(!['occurrence','future','series'].includes(scope)) throw new Error('Invalid edit scope')
      await changeOccurrence(actor,id,data.revision as number,string(data.field),typeof data.value==='string'?data.value:string(data.value),scope)
    } else throw new Error('Unknown operation')
    await syncOccurrence(id)
    if(body.op==='occurrence.edit' && data.scope!=='occurrence') await syncWorkspace(workspace)
  }
}
export async function handleScheduledMessages(request: ApiRequest,response: ApiResponse): Promise<void> {
  response.setHeader('Cache-Control','no-store')
  if(applyCors(request,response)) return
  const origin=headerValue(request.headers,'origin')
  // Same-origin browser GETs omit Origin. Reads still require a session and
  // workspace management permission; writes always require an allowed origin.
  if((origin!==null || request.method!=='GET') && !isAllowedOrigin(origin)) return response.status(403).json({error:'Forbidden origin'})
  if(!['GET','POST'].includes(request.method??'')) return response.status(405).json({error:'Method not allowed'})
  try {
    if(JSON.stringify(request.body??null).length>16000) return response.status(413).json({error:'Request too large'})
    const actor=await requireAuthenticatedUser(normaliseHeaders(request.headers))
    const body=request.method==='POST'?object(request.body):{}
    const workspace=uuid(request.method==='GET'?request.query?.workspaceId:body.workspaceId)
    await authorizeManagement(actor.userId,workspace)
    if(request.method==='POST') await mutate(actor.userId,workspace,body)
    response.status(200).json(await snapshot(workspace))
  } catch(error) {
    const status=error instanceof AuthError?401:error instanceof WorkspaceAccessError?403:400
    response.status(status).json({error:error instanceof Error?error.message:'Scheduled message operation failed'})
  }
}
