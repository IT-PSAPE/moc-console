import type { ScheduledFields, ScheduledMessageType } from './scheduled-message.js'
import type { ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
export type ScheduledOccurrence = {
 id:string;workspace_id:string;schedule_id:string;occurrence_on:string;send_on:string;expires_at:string;
 fields:ScheduledFields;body:string;message_type:ScheduledMessageType;require_arrival:boolean;attendance_groups?:ScheduledAttendanceGroup[];
 state:'scheduled'|'sending'|'sent'|'unknown'|'cancelled';revision:number;synced_revision:number;
 telegram_message_id:number|null;last_sync_error:string|null;
}
export type ScheduledSchedule = {
 id:string;workspace_id:string;template_id:string;group_chat_id:string;thread_id:number|null;
 starts_on:string;frequency:'once'|'daily'|'weekdays'|'weekly'|'monthly';timezone:string;
 expiry_hours:number;auto_send:boolean;enabled:boolean;
}
export type ScheduledTemplate = {id:string;name:string;message_type:ScheduledMessageType;body:string;fields:ScheduledFields;audience:string[];require_arrival:boolean;attendance_groups?:ScheduledAttendanceGroup[]}
export type MemberType = {id:string;name:string;is_default:boolean}
export type ScheduledMember = {id:string;name:string;memberTypeId:string}
export type ScheduledSnapshot = {
 occurrences:ScheduledOccurrence[];schedules:ScheduledSchedule[];templates:ScheduledTemplate[];memberTypes:MemberType[];members:ScheduledMember[];
 groups:{chat_id:string;title:string;telegram_group_topics:{thread_id:number;name:string;closed:boolean}[]}[];
}
export type ScheduledEditScope = 'occurrence'|'future'|'series'
export function scheduledOccurrenceSummary(o:ScheduledOccurrence,dates?:{sendOn:string;expiresAt:string}):string {
 const pending=o.state==='sent' && o.synced_revision<o.revision?' · Telegram update pending':''
 return `${dates?.sendOn ?? o.send_on} · ${o.state} · expires ${dates?.expiresAt ?? o.expires_at}${pending}${o.last_sync_error?` · ${o.last_sync_error}`:''}`
}
