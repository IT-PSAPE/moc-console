import { renderTemplate } from './render-template.js'
import { escapeHtml } from './template-tokens.js'
import type { InlineKeyboardMarkup } from './telegram-keyboard.js'

export type ScheduledMessageType = 'announcement' | 'pre_attendance'
export type ScheduledFields = Record<string, string>
export type ScheduledResponse = { name: string; status: 'awaiting' | 'attending' | 'not_attending'; arrivalTime: string | null }
export type ScheduledRenderInput = { id: string; messageType: ScheduledMessageType; body: string; fields: ScheduledFields; requireArrival: boolean }
export type ScheduledFieldDefinition = { key: string; label: string; input: 'text' | 'time'; maxLength: number }
export const SCHEDULED_FIELDS: Record<ScheduledMessageType, readonly ScheduledFieldDefinition[]> = {
 announcement: [{ key:'title',label:'Title',input:'text',maxLength:120 },{ key:'instructions',label:'Message',input:'text',maxLength:2000 }],
 pre_attendance: [{ key:'title',label:'Title',input:'text',maxLength:120 },{ key:'instructions',label:'Instructions',input:'text',maxLength:2000 },{ key:'expectedArrival',label:'Expected arrival',input:'time',maxLength:5 }],
}
export const SCHEDULED_DEFAULT_BODIES: Record<ScheduledMessageType,string> = {
 announcement: '<b>{{title}}</b>\n{{instructions}}',
 pre_attendance: '<b>{{title}}</b>\n{{instructions}}\nPlease arrive by {{expectedArrival}}.',
}
export const ARRIVAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function validateScheduledFields(type: ScheduledMessageType, fields: unknown): ScheduledFields {
 if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) throw new Error('Message fields must be an object')
 const result: ScheduledFields = {}
 for (const [key,value] of Object.entries(fields)) {
  const definition = SCHEDULED_FIELDS[type].find(field => field.key === key)
  if (!definition || typeof value !== 'string' || value.length > definition.maxLength) throw new Error(`Invalid message field: ${key}`)
  if (definition.input === 'time' && value !== '' && !ARRIVAL_TIME_PATTERN.test(value)) throw new Error('Use an arrival time such as 07:30')
  result[key]=value.trim()
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
 const body=renderTemplate(input.body,input.fields)
 const lines=responses.map(response => {
  const status=response.status === 'attending' ? `✅ Attending${response.arrivalTime ? ` · ${response.arrivalTime}` : input.requireArrival ? ' · time not set' : ''}` : response.status === 'not_attending' ? '❌ Not attending' : '⏳ Awaiting response'
  return `${escapeHtml(response.name)} — ${status}`
 })
 const text=[body,input.messageType === 'pre_attendance' ? lines.join('\n') : '',expired ? 'Closed' : ''].filter(Boolean).join('\n\n')
 if (text.replace(/<[^>]*>/g,'').length > 4096) throw new Error('Message exceeds Telegram’s text limit; shorten the template or audience')
 const replyMarkup:InlineKeyboardMarkup|null = expired || input.messageType !== 'pre_attendance' ? null : {inline_keyboard:[
  [{text:'Attending',callback_data:`sa:yes:${input.id}`},{text:'Not attending',callback_data:`sa:no:${input.id}`}],
  [{text:'Update response',callback_data:`sa:update:${input.id}`}],
 ]}
 return {text,replyMarkup}
}
