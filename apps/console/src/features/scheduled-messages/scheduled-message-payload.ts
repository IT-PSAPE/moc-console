import { validateScheduledAttendanceGroups, validateScheduledBody, type ScheduledAttendanceGroup, type ScheduledMessageType } from '@moc/notifications'
import { scheduledTimestamp } from './scheduled-timestamps'

export type NewMessageDraft = {
    messageType: ScheduledMessageType
    body: string
    attendanceGroups: ScheduledAttendanceGroup[]
    attendeeIds: string[]
    groupChatId: string
    threadId: string
    sendMode: 'now' | 'scheduled'
    startsOn: string
    frequency: 'once' | 'daily' | 'weekly' | 'monthly'
    untilOn: string
    followUpAmount: string
    followUpUnit: 'hours' | 'days'
}

type CommonPayload = {
    messageType: ScheduledMessageType
    body: string
    attendanceGroups: ScheduledAttendanceGroup[]
    attendeeIds: string[]
    groupChatId: string
    threadId: number | null
    followUpMinutes: number | null
}

export type ScheduledMessageCreatePayload = CommonPayload & (
    | { sendNow: true }
    | { startsOn: string; frequency: NewMessageDraft['frequency']; untilOn?: string }
)

export function followUpMinutes(amount: string, unit: 'hours' | 'days'): number {
    const value = Number(amount)
    if (!Number.isInteger(value) || value < 1) throw new Error('Enter a positive follow-up offset')
    const minutes = value * (unit === 'days' ? 1440 : 60)
    if (minutes > 525600) throw new Error('Follow-up offset must be one year or less')
    return minutes
}

export function createScheduledMessagePayload(draft: NewMessageDraft, timezone: string): ScheduledMessageCreatePayload {
    validateScheduledBody(draft.messageType, draft.body)
    if (!draft.body.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|\u00a0/gi, ' ').trim()) throw new Error('Add message content')
    const attendance = draft.messageType === 'attendance'
    const attendanceGroups = validateScheduledAttendanceGroups(draft.messageType, attendance ? draft.attendanceGroups : [])
    const attendeeIds = attendance ? [...draft.attendeeIds] : []
    if (attendance && attendeeIds.length === 0) throw new Error('Select at least one attendee')
    if (!draft.groupChatId) throw new Error('Choose a Telegram group')

    const threadId = draft.threadId ? Number(draft.threadId) : null
    if (threadId !== null && !Number.isSafeInteger(threadId)) throw new Error('Choose a valid Telegram topic')

    const common: CommonPayload = {
        messageType: draft.messageType,
        body: draft.body,
        attendanceGroups,
        attendeeIds,
        groupChatId: draft.groupChatId,
        threadId,
        followUpMinutes: attendance ? followUpMinutes(draft.followUpAmount, draft.followUpUnit) : null,
    }
    if (draft.sendMode === 'now') return { ...common, sendNow: true }

    const startsOn = scheduledTimestamp(draft.startsOn, timezone)
    const payload: CommonPayload & { startsOn: string; frequency: NewMessageDraft['frequency']; untilOn?: string } = { ...common, startsOn, frequency: draft.frequency }
    if (draft.frequency !== 'once' && draft.untilOn) {
        if (!isCalendarDate(draft.untilOn)) throw new Error('Choose a valid last recurring date')
        const firstDate = draft.startsOn.slice(0, 10)
        if (draft.untilOn < firstDate) throw new Error('Last recurring date must be on or after the first send date')
        payload.untilOn = draft.untilOn
    }
    return payload
}

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(`${value}T00:00:00.000Z`)
    return year >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}
