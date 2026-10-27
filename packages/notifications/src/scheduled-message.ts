import { renderScheduledContentTokens, validateScheduledContentTokens } from './scheduled-content-tokens.js'
import { validateScheduledAttendanceGroups, type ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
import { renderScheduledAttendanceRoster } from './scheduled-attendance-roster.js'
import type { InlineKeyboardMarkup } from './telegram-keyboard.js'

export type ScheduledMessageType = 'announcement' | 'attendance'
export type ScheduledPostRole = 'primary' | 'follow_up'
export type ScheduledResponseStatus = 'awaiting' | 'attending' | 'not_attending'
export type ScheduledResponse = {
    name: string
    status: ScheduledResponseStatus
    arrivalTime: string | null
    groupId?: string | null
    declineReason?: string | null
    checkedInAt?: string | null
}
export type ScheduledRenderInput = {
    id: string
    messageType: ScheduledMessageType
    body: string
    postRole?: ScheduledPostRole
    attendanceGroups?: ScheduledAttendanceGroup[]
    timezone?: string
    legacyClosed?: boolean
}
export type ScheduledRenderResult = { text: string; replyMarkup: InlineKeyboardMarkup | null }

const MESSAGE_TYPES = new Set<ScheduledMessageType>(['announcement', 'attendance'])

function validateScheduledRenderBody(messageType: ScheduledMessageType, body: string): void {
    if (!MESSAGE_TYPES.has(messageType)) throw new Error('Invalid message type')
    if (typeof body !== 'string' || !body.trim()) throw new Error('Message body is required')
    validateScheduledContentTokens(body)
}

/** New message bodies contain rich HTML plus explicit date/time content values. */
export function validateScheduledBody(messageType: ScheduledMessageType, body: string): void {
    if (!MESSAGE_TYPES.has(messageType)) throw new Error('Invalid message type')
    if (typeof body !== 'string' || !body.trim() || body.length > 3000) throw new Error('Message must contain 1–3000 characters')
    validateScheduledContentTokens(body)
}

/** Render the same deterministic text and action buttons for preview and delivery. */
export function renderScheduledMessage(input: ScheduledRenderInput, responses: ScheduledResponse[]): ScheduledRenderResult {
    const postRole = input.postRole ?? 'primary'
    const closed = input.legacyClosed ?? false
    if (postRole !== 'primary' && postRole !== 'follow_up') throw new Error('Invalid attendance post role')
    validateScheduledRenderBody(input.messageType, input.body)
    if (postRole === 'follow_up' && input.messageType !== 'attendance') throw new Error('Follow-up posts are only available for attendance messages')

    const groups = validateScheduledAttendanceGroups(input.messageType, input.attendanceGroups ?? [])
    const body = renderScheduledContentTokens(input.body)
    const roster = input.messageType === 'attendance'
        ? renderScheduledAttendanceRoster(groups, responses, postRole, input.timezone ?? 'Africa/Johannesburg')
        : ''
    const footer = input.messageType === 'attendance' ? `<footer>${postRole === 'primary' ? 'Pre-attendance' : 'Attendance'}</footer>` : ''
    const text = [body, roster, footer, closed ? 'Closed' : ''].filter(Boolean).join('\n\n')
    if (text.replace(/<[^>]*>/g, '').length > 4096) throw new Error('Message exceeds Telegram’s text limit; shorten the message or audience')

    let replyMarkup: InlineKeyboardMarkup | null = null
    if (!closed && input.messageType === 'attendance') {
        replyMarkup = postRole === 'primary'
            ? { inline_keyboard: [[
                { text: 'Attending', style: 'primary', callback_data: `sa:yes:${input.id}` },
                { text: 'Not attending', callback_data: `sa:no:${input.id}` },
            ]] }
            : { inline_keyboard: [[{ text: 'Attended', style: 'success', callback_data: `sa:check:${input.id}` }]] }
    }
    return { text, replyMarkup }
}
