import { DEFAULT_TIMEZONE, scheduledMessageLabel, validateScheduledAttendanceGroups, type ScheduledAttendanceGroup, type ScheduledEditScope, type ScheduledOccurrence, type ScheduledSnapshot } from '@moc/notifications'
import { formatUtcIsoInTimezone, formatUtcIsoForDateTimeInput } from '@moc/utils/zoned-date-time'
import { scheduledMessagePreview } from './scheduled-message-preview'
import type { NewMessageDraft } from './scheduled-message-payload'
import { notifyDestinationKey } from '@moc/types/streams/notify-destination'

export type ScheduledMessageOccurrenceView = ScheduledOccurrence & {
    label: string
    summary: string
    canManage: boolean
    canDelete: boolean
    canSend: boolean
    canResend: boolean
}

export type ScheduledMessageEditField = 'body' | 'attendanceGroups' | 'sendOn' | 'followUpMinutes'

type ScheduledMessageDraft = NewMessageDraft & { memberSearch: string }
type EditValue = { field: ScheduledMessageEditField; value: string }

export function canSendScheduledOccurrence(occurrence: ScheduledOccurrence): boolean {
    return occurrence.state === 'scheduled' && occurrence.post_role === 'primary'
}

function toOccurrenceView(occurrence: ScheduledOccurrence, snapshot: ScheduledSnapshot): ScheduledMessageOccurrenceView {
    const schedule = snapshot.schedules.find(item => item.id === occurrence.schedule_id)
    const timezone = schedule?.timezone ?? snapshot.workspaceTimezone ?? DEFAULT_TIMEZONE
    const sendOn = formatUtcIsoInTimezone(occurrence.send_on, timezone, { dateStyle: 'medium', timeStyle: 'short' })
    const summary = [
        sendOn,
        occurrence.state === 'sent' && occurrence.synced_revision < occurrence.revision ? 'Telegram update pending' : '',
        occurrence.last_sync_error ?? '',
    ].filter(Boolean).join(' · ')
    const canManage = !occurrence.legacy_closed && ['scheduled', 'sent'].includes(occurrence.state)
    return {
        ...occurrence,
        label: scheduledMessageLabel(occurrence.body),
        summary,
        canManage,
        canDelete: occurrence.state !== 'sending',
        canSend: canSendScheduledOccurrence(occurrence),
        canResend: occurrence.state === 'sent' && !occurrence.legacy_closed,
    }
}

export function createScheduledMessageViewModel(snapshot: ScheduledSnapshot, draft: ScheduledMessageDraft, editing: ScheduledOccurrence | null, details: ScheduledOccurrence | null, edit: EditValue, deleting: ScheduledOccurrence | null, frequencyItems: { value: NewMessageDraft['frequency']; label: string }[], scopeItems: { value: ScheduledEditScope; label: string }[], typeItems: { value: string; label: string }[], offsetUnitItems: { value: string; label: string }[]) {
    const destinationItems = snapshot.groups.flatMap(group => {
        const main = { groupChatId: group.chat_id, threadId: null }
        return [
            { ...main, value: notifyDestinationKey(main), label: group.title },
            ...group.telegram_group_topics.filter(topic => !topic.closed).map(topic => {
                const destination = { groupChatId: group.chat_id, threadId: topic.thread_id }
                return { ...destination, value: notifyDestinationKey(destination), label: `${group.title} › ${topic.name}` }
            }),
        ]
    })
    const selectedDestination = destinationItems.find(item => item.groupChatId === draft.groupChatId && (item.threadId === null ? '' : String(item.threadId)) === draft.threadId)
    const isAttendance = draft.messageType === 'attendance'
    const primaryPreview = scheduledMessagePreview({ id: 'message-preview', messageType: draft.messageType, body: draft.body, postRole: 'primary', attendanceGroups: draft.attendanceGroups, timezone: snapshot.workspaceTimezone }, snapshot.members, draft.attendeeIds)
    const followUpPreview = isAttendance
        ? scheduledMessagePreview({ id: 'follow-up-preview', messageType: 'attendance', body: draft.body, postRole: 'follow_up', attendanceGroups: draft.attendanceGroups, timezone: snapshot.workspaceTimezone }, snapshot.members, draft.attendeeIds)
        : null
    const editFieldItems = editing
        ? [
            { value: 'body', label: 'Message body' },
            ...(editing.message_type === 'attendance' ? [{ value: 'attendanceGroups', label: 'Attendance groups' }] : []),
            ...(editing.state === 'scheduled' && editing.post_role === 'primary' ? [{ value: 'sendOn', label: 'Send date and time' }] : []),
            ...(editing.message_type === 'attendance' && editing.post_role === 'primary' ? [{ value: 'followUpMinutes', label: 'Follow-up delay' }] : []),
        ]
        : []
    const editedBody = editing ? (edit.field === 'body' ? edit.value : editing.body) : ''
    const editedGroups = editing ? (edit.field === 'attendanceGroups' ? parseGroups(edit.value) : editing.attendance_groups) : []
    const editPreview = editing ? scheduledMessagePreview({ id: editing.id, messageType: editing.message_type, body: editedBody, postRole: editing.post_role, attendanceGroups: editedGroups, timezone: snapshot.workspaceTimezone }, snapshot.members, editing.attendee_ids) : null
    const activeSchedule = snapshot.schedules.find(item => item.id === editing?.schedule_id)
    const occurrences = snapshot.occurrences.map(occurrence => toOccurrenceView(occurrence, snapshot))
    const members = snapshot.members.map(member => {
        const index = draft.attendeeIds.indexOf(member.id)
        return { ...member, selected: index >= 0, position: index >= 0 ? index + 1 : null, matchesSearch: member.name.toLocaleLowerCase().includes(draft.memberSearch.toLocaleLowerCase()) }
    })

    return {
        occurrences,
        details: details ? toOccurrenceView(details, snapshot) : null,
        destinationItems,
        selectedDestination,
        isAttendance,
        isRecurring: draft.frequency !== 'once',
        primaryPreview,
        followUpPreview,
        editFieldItems,
        editPreview,
        editGroups: edit.field === 'attendanceGroups' ? parseGroups(edit.value) : [],
        editingLabel: editing ? scheduledMessageLabel(editing.body) : '',
        deletingLabel: deleting ? scheduledMessageLabel(deleting.body) : '',
        members,
        selectedAttendeeCount: draft.attendeeIds.length,
        hasMatchingMembers: members.some(member => member.matchesSearch),
        showScope: Boolean(activeSchedule && activeSchedule.frequency !== 'once' && edit.field !== 'sendOn'),
        frequencyItems,
        scopeItems,
        typeItems,
        offsetUnitItems,
        workspaceTimezone: snapshot.workspaceTimezone,
    }
}

function parseGroups(value: string): ScheduledAttendanceGroup[] {
    try { return JSON.parse(value) as ScheduledAttendanceGroup[] }
    catch { return [] }
}

export function editValueForOccurrence(field: ScheduledMessageEditField, occurrence: ScheduledOccurrence, snapshot: ScheduledSnapshot): string {
    if (field === 'attendanceGroups') return JSON.stringify(validateScheduledAttendanceGroups(occurrence.message_type, occurrence.attendance_groups))
    if (field === 'sendOn') {
        const schedule = snapshot.schedules.find(item => item.id === occurrence.schedule_id)
        return formatUtcIsoForDateTimeInput(occurrence.send_on, schedule?.timezone ?? snapshot.workspaceTimezone)
    }
    if (field === 'followUpMinutes') {
        const schedule = snapshot.schedules.find(item => item.id === occurrence.schedule_id)
        return String(schedule?.follow_up_minutes ?? '')
    }
    return occurrence.body
}
