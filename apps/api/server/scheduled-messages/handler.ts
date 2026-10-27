import { validateScheduledBody, validateScheduledAttendanceGroups, type ScheduledMessageType } from '@moc/notifications'
import { requireAuthenticatedUser, AuthError } from '../auth-guard.js'
import { applyCors, isAllowedOrigin } from '../cors.js'
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse } from '../http.js'
import { queryRows } from '@moc/backend/database'
import type { PoolClient, QueryResultRow } from 'pg'
import { WorkspaceAccessError } from '../workspace-access.js'
import { authorizeManagement, changeOccurrence, deleteOccurrence, getOccurrence, listActive, listHistory, scheduledRpc, sendOccurrence, resendOccurrence } from './store.js'
import { syncOccurrence, syncWorkspace } from './worker.js'
import { syncManagementCommands } from './commands.js'
import { isOffsetDateTime } from './date-validation.js'
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
function isCalendarDate(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed=new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value
}
export function scheduledSnapshotView(value: unknown): 'active' | 'history' {
  if(value===undefined || value==='active') return 'active'
  if(value==='history') return 'history'
  throw new Error('Invalid scheduled message view')
}
export async function scheduledSnapshot(workspace: string,client?:PoolClient,materialize=true,view: 'active' | 'history'='active',cursor?:unknown): Promise<unknown> {
  const history=view==='history'?await listHistory(workspace,client,cursor):null
  const occurrences=history?.occurrences??await listActive(workspace,undefined,client,materialize)
  const [timezoneRows,schedules,memberTypes,groups,members]=await Promise.all([
    queryRows<QueryResultRow & { workspace_timezone: string }>('SELECT public.workspace_timezone($1) AS workspace_timezone',[workspace],client),
    queryRows<QueryResultRow>('SELECT * FROM public.scheduled_message_schedules WHERE workspace_id=$1',[workspace],client),
    queryRows<QueryResultRow>('SELECT * FROM public.workspace_member_types WHERE workspace_id=$1 ORDER BY name',[workspace],client),
    queryRows<QueryResultRow & { topics: unknown[] }>(
      `SELECT g.chat_id,g.title,coalesce(jsonb_agg(jsonb_build_object('thread_id',t.thread_id,'name',t.name,'closed',t.closed)) FILTER (WHERE t.thread_id IS NOT NULL),'[]'::jsonb) AS topics
       FROM public.telegram_groups g LEFT JOIN public.telegram_group_topics t ON t.group_chat_id=g.chat_id
       WHERE g.workspace_id=$1 AND g.active AND g.removed_at IS NULL GROUP BY g.chat_id,g.title`,[workspace],client),
    queryRows<QueryResultRow & { user_id:string;member_type_id:string;name:string;surname:string }>(
      `SELECT w.user_id,w.member_type_id,u.name,u.surname FROM public.workspace_users w JOIN public.users u ON u.id=w.user_id
       WHERE w.workspace_id=$1 ORDER BY u.name,u.surname,w.user_id`,[workspace],client),
  ])
  const workspaceTimezone=timezoneRows[0]?.workspace_timezone
  if(!workspaceTimezone) throw new Error('Workspace timezone is unavailable')
  const normalizedGroups=groups.map(({ topics,...group })=>({...group,telegram_group_topics:topics}))
  const normalizedMembers=members.map(row=>({id:row.user_id,memberTypeId:row.member_type_id,name:`${row.name} ${row.surname}`.trim()}))
  return {occurrences,schedules,memberTypes,groups:normalizedGroups,members:normalizedMembers,workspaceTimezone,...(history?{nextHistoryCursor:history.nextHistoryCursor}:{})}
}
const removedScheduleInputs=['templateId','creationId','fields','title','instructions','requireArrival','arrivalTime','expiresAt','expiryHours','autoSend','audience','timezone','expiresOn','expiryDate'] as const
function rejectRemovedScheduleInputs(data: Record<string,unknown>): void {
  const removed=removedScheduleInputs.find(key=>Object.hasOwn(data,key))
  if(removed) throw new Error(`Unsupported scheduled message input: ${removed}`)
}
const createScheduleKeys=new Set(['messageType','body','attendeeIds','attendanceGroups','followUpMinutes','groupChatId','threadId','sendNow','startsOn','frequency','untilOn'])
function rejectUnknownScheduleInputs(data: Record<string,unknown>): void {
  const unknown=Object.keys(data).find(key=>!createScheduleKeys.has(key))
  if(unknown) throw new Error(`Unsupported scheduled message input: ${unknown}`)
}
function optionalUuidList(value: unknown): string[] {
  if(value===undefined) return []
  if(!Array.isArray(value)) throw new Error('Invalid attendees')
  const ids=value.map(uuid)
  if(new Set(ids).size!==ids.length) throw new Error('Attendees cannot be duplicated')
  return ids
}
function createScheduleData(input: Record<string,unknown>): Record<string,unknown> {
  rejectRemovedScheduleInputs(input)
  rejectUnknownScheduleInputs(input)
  const messageType=string(input.messageType) as ScheduledMessageType
  if(!['announcement','attendance'].includes(messageType)) throw new Error('Invalid message type')
  const body=string(input.body)
  validateScheduledBody(messageType,body)
  const attendanceGroups=validateScheduledAttendanceGroups(messageType,input.attendanceGroups??[])
  const attendeeIds=optionalUuidList(input.attendeeIds)
  const followUpMinutes=input.followUpMinutes
  if(messageType==='attendance') {
    if(!attendeeIds.length) throw new Error('Select at least one attendee')
    if(!Number.isInteger(followUpMinutes) || Number(followUpMinutes)<1 || Number(followUpMinutes)>525600) throw new Error('Follow-up must be 1 to 525600 minutes after the primary message')
  } else {
    if(attendanceGroups.length || attendeeIds.length) throw new Error('Attendance settings require an Attendance message')
    if(followUpMinutes!==undefined && followUpMinutes!==null) throw new Error('Announcements cannot have an Attendance follow-up')
  }
  string(input.groupChatId)
  if(input.threadId!==undefined && input.threadId!==null && (!Number.isSafeInteger(input.threadId) || Number(input.threadId)<1)) throw new Error('Invalid Telegram topic')
  const common={messageType,body,groupChatId:input.groupChatId,threadId:input.threadId??null,attendanceGroups,attendeeIds,followUpMinutes:messageType==='attendance'?followUpMinutes:null}
  if(input.sendNow===true) {
    if(['startsOn','frequency','untilOn'].some(key=>Object.hasOwn(input,key))) throw new Error('Send now cannot include schedule dates or recurrence')
    return {...common,sendNow:true}
  }
  if(Object.hasOwn(input,'sendNow')) throw new Error('Scheduled messages must omit sendNow')
  if(!['once','daily','weekly','monthly'].includes(string(input.frequency))) throw new Error('Invalid repeat frequency')
  const startsOn=string(input.startsOn)
  if(!isOffsetDateTime(startsOn)) throw new Error('Invalid scheduled date and time; include a timezone offset')
  if(input.untilOn!==undefined && input.untilOn!==null && (typeof input.untilOn!=='string' || !isCalendarDate(input.untilOn))) throw new Error('Invalid last recurring date')
  return {...common,startsOn,frequency:input.frequency,untilOn:input.untilOn??null}
}
export async function mutateScheduledMessages(actor: string,workspace: string,body: Record<string,unknown>,client?:PoolClient): Promise<void> {
  const data=object(body.data)
  if(body.op==='schedule.create') {
    await scheduledRpc('create_scheduled_schedule',{p_actor:actor,p_workspace:workspace,p_data:createScheduleData(data)},client)
  } else if(body.op==='commands.sync') {
    const result=await syncManagementCommands(workspace)
    if(result.failed) throw new Error(`Telegram could not update ${result.failed} command menus. The daily worker will retry.`)
  } else {
    const id=uuid(data.id)
    const occurrence=await getOccurrence(id,client)
    if(occurrence.workspace_id!==workspace) throw new WorkspaceAccessError('Message belongs to another workspace')
    if(body.op==='occurrence.delete') {
      if(!Number.isInteger(data.revision)) throw new Error('Invalid revision')
      const scope=string(data.scope) as EditScope
      if(!['occurrence','future','series'].includes(scope)) throw new Error('Invalid delete scope')
      const deleted=await deleteOccurrence(actor,id,data.revision as number,scope,client)
      for(const target of deleted) await syncOccurrence(target)
      for(const target of deleted) {
        const result=await getOccurrence(target,client)
        if(result.last_sync_error) throw new Error(`Message cancelled in Console; Telegram cleanup failed: ${result.last_sync_error}. Retry deletion.`)
      }
      return
    }
    if(body.op==='occurrence.send') {
      if(occurrence.post_role!=='primary') throw new Error('Only a primary message can be sent manually')
      await sendOccurrence(actor,id,client)
    }
    else if(body.op==='occurrence.resend') {
      if(!Number.isInteger(data.revision)) throw new Error('Invalid revision')
      await resendOccurrence(actor,id,data.revision as number,client)
    }
    else if(body.op==='occurrence.edit') {
      if(!Number.isInteger(data.revision)) throw new Error('Invalid revision')
      const scope=string(data.scope) as EditScope
      if(!['occurrence','future','series'].includes(scope)) throw new Error('Invalid edit scope')
      const field=string(data.field)
      if(!['body','attendanceGroups','sendOn','followUpMinutes'].includes(field)) throw new Error('Invalid message field')
      const value=typeof data.value==='string'?data.value:string(data.value)
      if(field==='body') validateScheduledBody(occurrence.message_type,value)
      if(field==='attendanceGroups') validateScheduledAttendanceGroups(occurrence.message_type,JSON.parse(value) as unknown)
      if(field==='sendOn'&&(occurrence.post_role!=='primary'||occurrence.state!=='scheduled'||scope!=='occurrence')) throw new Error('Only an unsent primary occurrence can be moved')
      if(field==='sendOn'&&!isOffsetDateTime(value)) throw new Error('Invalid scheduled date and time; include a timezone offset')
      if(field==='followUpMinutes') {
        if(occurrence.message_type!=='attendance'||occurrence.post_role!=='primary') throw new Error('Follow-up delay can only be changed on an Attendance message')
        if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>525600) throw new Error('Follow-up must be 1 to 525600 minutes after the primary message')
      }
      await changeOccurrence(actor,id,data.revision as number,field,value,scope,client)
    } else throw new Error('Unknown operation')
    await syncOccurrence(id)
    if(body.op==='occurrence.edit') await syncWorkspace(workspace)
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
    if(request.method==='POST') await mutateScheduledMessages(actor.userId,workspace,body)
    const view=request.method==='GET'?scheduledSnapshotView(request.query?.view):'active'
    response.status(200).json(await scheduledSnapshot(workspace,undefined,true,view,request.query?.cursor))
  } catch(error) {
    const status=error instanceof AuthError?401:error instanceof WorkspaceAccessError||(error instanceof Error&&error.message==='Not authorised')?403:400
    response.status(status).json({error:error instanceof Error?error.message:'Scheduled message operation failed'})
  }
}
