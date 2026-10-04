import { SCHEDULED_FIELDS, scheduledOccurrenceSummary, validateScheduledAttendanceGroups, validateScheduledFields } from '@moc/notifications'
import { assertActive, authorizeManagement, changeOccurrence, getOccurrence, getSchedule, listActive, sendOccurrence } from './store.js'
import { finishSession, promptSession, saveSession, sessionButton, setDraft, showSession } from './sessions.js'
import { syncOccurrence, syncWorkspace } from './worker.js'
import type { EditScope, MessageSession } from './types.js'

export async function showManagementList(s: MessageSession,page=0,callbackId?: string,replyId?: number): Promise<void> {
  await authorizeManagement(s.user_id,s.workspace_id)
  const active=await listActive(s.workspace_id,s.chat_id)
  const subset=active.slice(page*8,page*8+8)
  await saveSession(s,{occurrence_id:null,data:{choices:subset.map(o=>o.id)}})
  const rows=subset.map((o,i)=>[sessionButton(s,`${o.fields.title} · ${o.send_on} · ${o.state}`,`pick:${i}`)])
  if(page>0) rows.push([sessionButton(s,'Previous',`list:${page-1}`)])
  if((page+1)*8<active.length) rows.push([sessionButton(s,'Next',`list:${page+1}`)])
  rows.push([sessionButton(s,'Close','close')])
  await showSession(s,active.length?'Manage messages — select an occurrence.':'No active messages in this group.',rows,callbackId,replyId)
}
export async function showOccurrence(s: MessageSession): Promise<void> {
  const o=await getOccurrence(s.occurrence_id!)
  assertActive(o)
  await saveSession(s,{data:{revision:o.revision}})
  const defs=SCHEDULED_FIELDS[o.message_type]
  const rows=defs.map((f,i)=>[sessionButton(s,f.label,`field:${i}`)])
  const attendanceGroups=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
  attendanceGroups.forEach((group,index)=>rows.push([sessionButton(s,`Rename group: ${group.label}`,`group:${index}`)]))
  if(o.state==='scheduled') rows.push([sessionButton(s,'Send date','field:sendOn'),sessionButton(s,'Send now','send')])
  rows.push([sessionButton(s,'Expiry date','field:expiresAt'),sessionButton(s,'Expiry hours','field:expiryHours')])
  rows.push([sessionButton(s,'Back','list:0'),sessionButton(s,'Close','close')])
  await showSession(s,`${o.fields.title}\n${scheduledOccurrenceSummary(o)}\nSelect a field to edit.`,rows)
}
export async function confirmAdminDraft(s: MessageSession): Promise<void> {
  const o=await getOccurrence(s.occurrence_id!)
  assertActive(o)
  const groups=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
  const proposedGroups=s.data.field==='attendanceGroups'?validateScheduledAttendanceGroups(o.message_type,JSON.parse(s.data.value??'[]')):[]
  const current=s.data.field==='sendOn'?o.send_on:s.data.field==='expiresAt'?o.expires_at:s.data.field==='expiryHours'?'Current schedule duration':s.data.field==='attendanceGroups'?(groups[s.data.groupIndex??-1]?.label??groups.map(group=>group.label).join(', ')):o.fields[s.data.field!]
  const proposed=s.data.field==='attendanceGroups'?(proposedGroups[s.data.groupIndex??-1]?.label??proposedGroups.map(group=>group.label).join(', ')):s.data.value
  const schedule=await getSchedule(o.schedule_id)
  if(schedule.frequency!=='once' && !s.data.scope && !['sendOn','expiresAt'].includes(s.data.field!)) {
    await showSession(s,'Apply this edit to:',[[sessionButton(s,'This occurrence','scope:occurrence')],[sessionButton(s,'This and future occurrences','scope:future')],[sessionButton(s,'Entire series','scope:series')],[sessionButton(s,'Cancel','detail')]])
    return
  }
  await setDraft(s,{...s.data,scope:s.data.scope??'occurrence',stage:'confirm'})
  await showSession(s,`Confirm ${s.data.field==='attendanceGroups'?'group names':s.data.field}\n${current??'(empty)'} → ${proposed}\nScope: ${s.data.scope}`,[[sessionButton(s,'Apply change','apply'),sessionButton(s,'Cancel','detail')]])
}
export async function adminCallback(s: MessageSession,action: string,arg: string|undefined,callbackId: string): Promise<void> {
  if(action==='list') return showManagementList(s,Math.max(0,Number(arg)||0))
  if(action==='close') return finishSession(s,'Management closed.')
  if(action==='pick') {
    const id=s.data.choices?.[Number(arg)]
    if(!id) throw new Error('Invalid selection')
    const o=await getOccurrence(id)
    const schedule=await getSchedule(o.schedule_id)
    if(o.workspace_id!==s.workspace_id || schedule.group_chat_id!==s.chat_id) throw new Error('Message unavailable')
    await saveSession(s,{occurrence_id:id})
    return showOccurrence(s)
  }
  if(!s.occurrence_id) throw new Error('Select a message first')
  const o=await getOccurrence(s.occurrence_id)
  assertActive(o)
  if(s.data.revision!==undefined && s.data.revision!==o.revision) throw new Error('The message changed. Reopen the management flow before editing.')
  if(action==='detail') return showOccurrence(s)
  if(action==='field') {
    const defs=SCHEDULED_FIELDS[o.message_type]
    const field=['sendOn','expiresAt','expiryHours'].includes(arg??'')?arg!:defs[Number(arg)]?.key
    if(!field) throw new Error('Invalid field')
    await setDraft(s,{revision:o.revision,field})
    return promptSession(s,field==='sendOn'?o.send_on:field==='expiresAt'?o.expires_at:field==='expiryHours'?String((await getSchedule(o.schedule_id)).expiry_hours):o.fields[field],field,callbackId)
  }
  if(action==='group') {
    if(!/^[0-7]$/.test(arg??'')) throw new Error('Invalid group selection')
    const groups=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
    const group=groups[Number(arg)]
    if(!group) throw new Error('Invalid group selection')
    await setDraft(s,{revision:o.revision,field:`attendanceGroup:${Number(arg)}`})
    return promptSession(s,group.label,'group label',callbackId)
  }
  if(action==='send') {
    await setDraft(s,{revision:o.revision,field:'sendNow',stage:'confirm'})
    return showSession(s,'Send this occurrence now?',[[sessionButton(s,'Send now','apply'),sessionButton(s,'Cancel','detail')]])
  }
  if(action==='scope') {
    if(!['occurrence','future','series'].includes(arg??'')) throw new Error('Invalid scope')
    await setDraft(s,{...s.data,scope:arg as EditScope})
    return confirmAdminDraft(s)
  }
  if(action==='apply') {
    if(s.data.stage!=='confirm') throw new Error('Confirm the edit first')
    if(s.data.field==='sendNow') await sendOccurrence(s.user_id,o.id)
    else await changeOccurrence(s.user_id,o.id,s.data.revision!,s.data.field!,s.data.value!,s.data.scope??'occurrence')
    await syncOccurrence(o.id)
    if(s.data.scope && s.data.scope!=='occurrence') await syncWorkspace(s.workspace_id)
    await showOccurrence(s)
    return
  }
  throw new Error('This action is unavailable')
}
export async function adminInput(s: MessageSession,value: string): Promise<void> {
  const o=await getOccurrence(s.occurrence_id!)
  assertActive(o)
  if(!s.data.field) throw new Error('No field selected')
  if(s.data.revision!==undefined && s.data.revision!==o.revision) throw new Error('The message changed. Reopen the management flow before editing.')
  if(s.data.field.startsWith('attendanceGroup:')) {
    const groups=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
    const index=Number(s.data.field.slice('attendanceGroup:'.length))
    if(!Number.isInteger(index) || !groups[index]) throw new Error('This group is no longer available')
    groups[index]={...groups[index]!,label:value.trim()}
    const validated=validateScheduledAttendanceGroups(o.message_type,groups)
    await setDraft(s,{revision:o.revision,field:'attendanceGroups',groupIndex:index,value:JSON.stringify(validated),stage:'confirm'})
    return confirmAdminDraft(s)
  }
  if(!['sendOn','expiresAt','expiryHours'].includes(s.data.field)) validateScheduledFields(o.message_type,{...o.fields,[s.data.field]:value})
  await setDraft(s,{...s.data,value,stage:'confirm'})
  await confirmAdminDraft(s)
}
