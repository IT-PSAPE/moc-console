import type { ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
import type { ScheduledMessageType, ScheduledPostRole } from './scheduled-message.js'

export type ScheduledOccurrenceState = 'scheduled' | 'sending' | 'sent' | 'unknown' | 'cancelled'
export type ScheduledFrequency = 'once' | 'daily' | 'weekdays' | 'weekly' | 'monthly'

export type ScheduledOccurrence = {
    id: string
    workspace_id: string
    schedule_id: string
    occurrence_on: string
    send_on: string
    post_role: ScheduledPostRole
    parent_occurrence_id: string | null
    legacy_closed: boolean
    message_type: ScheduledMessageType
    body: string
    attendee_ids: string[]
    attendance_groups: ScheduledAttendanceGroup[]
    state: ScheduledOccurrenceState
    revision: number
    synced_revision: number
    telegram_message_id: number | null
    last_sync_error: string | null
}

export type ScheduledSchedule = {
    id: string
    workspace_id: string
    message_type: ScheduledMessageType
    body: string
    attendee_ids: string[]
    attendance_groups: ScheduledAttendanceGroup[]
    group_chat_id: string
    thread_id: number | null
    starts_on: string
    send_time: string
    until_on: string | null
    frequency: ScheduledFrequency
    timezone: string
    follow_up_minutes: number | null
    enabled: boolean
}

export type MemberType = { id: string; name: string; is_default: boolean }
export type ScheduledMember = { id: string; name: string; memberTypeId: string }
export type ScheduledSnapshot = {
    nextHistoryCursor?: string | null
    workspaceTimezone: string
    occurrences: ScheduledOccurrence[]
    schedules: ScheduledSchedule[]
    memberTypes: MemberType[]
    members: ScheduledMember[]
    groups: { chat_id: string; title: string; telegram_group_topics: { thread_id: number; name: string; closed: boolean }[] }[]
}
export type ScheduledEditScope = 'occurrence' | 'future' | 'series'

/** A compact list label derived from the first visible line of message body. */
export function scheduledMessageLabel(body: string): string {
    const visible = body
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .split(/\r?\n/)
        .map(line => line.replace(/\s+/g, ' ').trim())
        .find(Boolean) ?? ''
    if (!visible) return 'Message'
    return visible.length > 80 ? `${visible.slice(0, 77).trimEnd()}…` : visible
}

export function scheduledOccurrenceSummary(occurrence: ScheduledOccurrence): string {
    const pending = occurrence.state === 'sent' && occurrence.synced_revision < occurrence.revision ? ' · Telegram update pending' : ''
    return `${occurrence.send_on} · ${occurrence.state}${pending}${occurrence.last_sync_error ? ` · ${occurrence.last_sync_error}` : ''}`
}
