import { renderTemplate } from './render-template.js'
import { formatScheduledDate } from './scheduled-date.js'
import type { InlineKeyboardMarkup } from './telegram-keyboard.js'
import { validateScheduledAttendanceGroups, type ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
import { renderScheduledAttendanceRoster } from './scheduled-attendance-roster.js'

export type ScheduledMessageType = 'announcement' | 'pre_attendance'
export type ScheduledFields = Record<string, string>
export type ScheduledResponse = { name: string; status: 'awaiting' | 'attending' | 'not_attending'; arrivalTime: string | null; groupId?: string | null }
export type ScheduledRenderInput = { id: string; messageType: ScheduledMessageType; body: string; fields: ScheduledFields; requireArrival: boolean; attendanceGroups?: ScheduledAttendanceGroup[] }
export type ScheduledFieldDefinition = { key: string; label: string; maxLength: number; inputType?: 'date' }
export const SCHEDULED_FIELDS: Record<ScheduledMessageType, readonly ScheduledFieldDefinition[]> = {
 announcement: [{ key:'title',label:'Title',maxLength:120 },{ key:'instructions',label:'Message',maxLength:2000 },{ key:'date',label:'Date',maxLength:10,inputType:'date' }],
 pre_attendance: [{ key:'title',label:'Title',maxLength:120 },{ key:'instructions',label:'Instructions',maxLength:2000 },{ key:'date',label:'Date',maxLength:10,inputType:'date' }],
}
export const SCHEDULED_DEFAULT_BODIES: Record<ScheduledMessageType,string> = {
 announcement: '<b>{{title}}</b>\n{{date}}\n{{instructions}}',
 pre_attendance: '<b>{{title}}</b>\n{{date}}\n{{instructions}}',
}
export const ARRIVAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function validateScheduledFields(type: ScheduledMessageType, fields: unknown): ScheduledFields {
 if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) throw new Error('Message fields must be an object')
 const result: ScheduledFields = {}
 for (const [key,value] of Object.entries(fields)) {
  const definition = SCHEDULED_FIELDS[type].find(field => field.key === key)
  if (!definition || typeof value !== 'string' || value.length > definition.maxLength) throw new Error(`Invalid message field: ${key}`)
  result[key]=value.trim()
  if (definition.inputType==='date') formatScheduledDate(result[key])
 }
 if (!result.title) throw new Error('A title is required')
 return result
}

export function validateScheduledBody(type: ScheduledMessageType, body: string): void {
 if (!body.trim() || body.length > 3000) throw new Error('Template must contain 1–3000 characters')
 const allowed = new Set(SCHEDULED_FIELDS[type].map(field => field.key))
 for (const token of body.matchAll(/{{(\w+)}}/g)) if (!allowed.has(token[1])) throw new Error(`Unknown template field: ${token[1]}`)
}

export function renderScheduledMessage(input: ScheduledRenderInput, responses: ScheduledResponse[], expired: boolean): { text: string; replyMarkup: InlineKeyboardMarkup | null } {
 const body=renderTemplate(input.body,{...input.fields,date:formatScheduledDate(input.fields.date ?? '')})
 const groups=validateScheduledAttendanceGroups(input.messageType,input.attendanceGroups??[])
 const roster=input.messageType === 'pre_attendance' ? renderScheduledAttendanceRoster(groups,responses) : ''
 const text=[body,roster,expired ? 'Closed' : ''].filter(Boolean).join('\n\n')
 if (text.replace(/<[^>]*>/g,'').length > 4096) throw new Error('Message exceeds Telegram’s text limit; shorten the template or audience')
 const replyMarkup:InlineKeyboardMarkup|null = expired || input.messageType !== 'pre_attendance' ? null : {inline_keyboard:[
  [{text:'Attending',callback_data:`sa:yes:${input.id}`},{text:'Not attending',callback_data:`sa:no:${input.id}`}],
  [{text:'Update response',callback_data:`sa:update:${input.id}`}],
 ]}
 return {text,replyMarkup}
}
