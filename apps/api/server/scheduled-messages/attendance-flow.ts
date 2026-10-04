import { ARRIVAL_TIME_PATTERN, validateScheduledAttendanceGroups } from '@moc/notifications'
import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'
import { assertActive, getOccurrence, getResponses, respondAttendance } from './store.js'
import { clearSession, promptSession, sessionButton, setDraft, showSession } from './sessions.js'
import { syncOccurrence } from './worker.js'
import type { MessageSession, Occurrence } from './types.js'

export async function attendanceOccurrence(s: MessageSession): Promise<Occurrence> {
  const o=await getOccurrence(s.occurrence_id!)
  assertActive(o)
  if(o.state!=='sent' || o.message_type!=='pre_attendance') throw new Error('Attendance is closed')
  const [membership]=await queryRows<QueryResultRow & { user_id: string }>('SELECT user_id FROM public.workspace_users WHERE workspace_id=$1 AND user_id=$2',[o.workspace_id,s.user_id])
  if(!membership || o.workspace_id!==s.workspace_id) throw new Error('You are not a member of this workspace')
  if(!(await getResponses(o.id)).some(r=>r.user_id===s.user_id)) throw new Error('You are not in this attendance roster')
  if(s.data.revision !== undefined && s.data.revision !== o.revision) throw new Error('The message changed. Restart your response before submitting.')
  validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
  return o
}
export async function showAttendance(s: MessageSession,callbackId?: string): Promise<void> {
  const o=await attendanceOccurrence(s)
  const response=(await getResponses(o.id)).find(r=>r.user_id===s.user_id)!
  const selectedGroup=o.attendance_groups?.find(group=>group.id===response.group_id)
  await setDraft(s,{revision:o.revision})
  await showSession(s,`${o.fields.title}\nCurrent response: ${response.status.replace('_',' ')}${selectedGroup?` · ${selectedGroup.label}`:''}${response.arrival_time?` · ${response.arrival_time}`:''}`,[[sessionButton(s,'Attending','yes'),sessionButton(s,'Not attending','no')],[sessionButton(s,'Cancel','close')]],callbackId)
}
export async function chooseAttendance(s: MessageSession,status: 'attending'|'not_attending',callbackId?: string): Promise<void> {
  const o=await attendanceOccurrence(s)
  if(status==='attending' && (o.attendance_groups?.length??0)>0) {
    const choices=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups)
    await setDraft(s,{revision:o.revision,status,attendanceChoices:choices,stage:'group'})
    const rows=choices.map((group,index)=>[sessionButton(s,group.label,`group:${index}`)])
    rows.push([sessionButton(s,'Cancel','close')])
    await showSession(s,`${o.fields.title}\nChoose your group.`,rows,callbackId)
    return
  }
  await setDraft(s,{revision:o.revision,status})
  if(status==='attending' && o.require_arrival) {
    const response=(await getResponses(o.id)).find(r=>r.user_id===s.user_id)!
    await showSession(s,`${o.fields.title}\nPlease provide your arrival time.`,[[sessionButton(s,'Cancel','close')]],callbackId)
    return promptSession(s,response.arrival_time??'Not set','arrival time (HH:mm)',callbackId)
  }
  await commitAttendance(s,o,status,null,null,callbackId)
}
export async function chooseAttendanceGroup(s: MessageSession,index: number,callbackId?: string): Promise<void> {
  const o=await attendanceOccurrence(s)
  if(s.data.stage!=='group' || !Number.isInteger(index) || index<0) throw new Error('This group choice is unavailable')
  const current=validateScheduledAttendanceGroups(o.message_type,o.attendance_groups??[])
  const saved=s.data.attendanceChoices
  if(!Array.isArray(saved) || saved.length!==current.length) throw new Error('The available groups changed. Restart your response.')
  const choice=current[index]
  const original=saved[index]
  if(!choice || !original || typeof original!=='object' || choice.id!==original.id || choice.label!==original.label) throw new Error('This group choice is unavailable')
  await setDraft(s,{revision:o.revision,status:'attending',groupId:choice.id})
  if(o.require_arrival) {
    const response=(await getResponses(o.id)).find(r=>r.user_id===s.user_id)!
    await showSession(s,`${o.fields.title}\nGroup: ${choice.label}\nPlease provide your arrival time.`,[[sessionButton(s,'Cancel','close')]],callbackId)
    return promptSession(s,response.arrival_time??'Not set','arrival time (HH:mm)',callbackId)
  }
  await commitAttendance(s,o,'attending',null,choice.id,callbackId)
}
async function commitAttendance(s: MessageSession,o: Occurrence,status: 'attending'|'not_attending',arrival: string|null,groupId: string|null,callbackId?: string): Promise<void> {
  await showSession(s,`${o.fields.title}\nSaving your response…`,[],callbackId)
  await respondAttendance(s.user_id,o,status,arrival,groupId)
  await syncOccurrence(o.id)
  await clearSession(s)
}
export async function attendanceInput(s: MessageSession,value: string): Promise<void> {
  if(!ARRIVAL_TIME_PATTERN.test(value)) throw new Error('Enter a time in HH:mm format, for example 07:30.')
  const o=await attendanceOccurrence(s)
  if(!s.data.groupId && (o.attendance_groups?.length??0)>0) throw new Error('Select a group before submitting.')
  await commitAttendance(s,o,'attending',value,s.data.groupId??null)
}
export async function attendanceCallback(s: MessageSession,action: string,arg: string|undefined,callbackId: string): Promise<void> {
  if(action==='close') return clearSession(s)
  if(action==='yes' || action==='no') return chooseAttendance(s,action==='yes'?'attending':'not_attending',callbackId)
  if(action==='group') {
    if(!/^[0-7]$/.test(arg??'')) throw new Error('This group choice is unavailable')
    return chooseAttendanceGroup(s,Number(arg),callbackId)
  }
  throw new Error('This attendance action is unavailable')
}
