import { escapeHtml } from './template-tokens.js'
import type { ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
import type { ScheduledPostRole, ScheduledResponse } from './scheduled-message.js'

function formatCheckInTime(value: string, timezone: string): string {
    const instant = new Date(value)
    if (Number.isNaN(instant.getTime())) throw new Error('Invalid check-in timestamp')
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant)
}

function attendeeLine(response: ScheduledResponse, postRole: ScheduledPostRole, timezone: string): string {
    const name = escapeHtml(response.name)
    if (postRole === 'follow_up' && response.checkedInAt) return `✅ ${name} — ${formatCheckInTime(response.checkedInAt, timezone)}`
    if (response.status === 'not_attending') {
        const reason = response.declineReason ? ` — ${escapeHtml(response.declineReason)}` : ''
        return `❌ ${name}${reason}`
    }
    const arrival = response.status === 'attending' && response.arrivalTime ? ` — ${escapeHtml(response.arrivalTime)}` : ''
    return `🔁 ${name}${arrival}`
}

function section(label: string, responses: ScheduledResponse[], postRole: ScheduledPostRole, timezone: string): string {
    return [`<b>${escapeHtml(label)}:</b>`, ...responses.map(response => attendeeLine(response, postRole, timezone))].join('\n')
}

function appearsInRosterGroup(response: ScheduledResponse, postRole: ScheduledPostRole): boolean {
    return response.status === 'attending' || (postRole === 'follow_up' && Boolean(response.checkedInAt))
}

export function renderScheduledAttendanceRoster(groups: ScheduledAttendanceGroup[], responses: ScheduledResponse[], postRole: ScheduledPostRole, timezone: string): string {
    if (!groups.length) return responses.map(response => attendeeLine(response, postRole, timezone)).join('\n')
    const validIds = new Set(groups.map(group => group.id))
    if (responses.some(response => response.groupId && !validIds.has(response.groupId))) throw new Error('Attendance group is unavailable')

    const sections = groups.map(group => section(group.label, responses.filter(response => appearsInRosterGroup(response, postRole) && response.groupId === group.id), postRole, timezone))
    const pending = responses.filter(response => response.status === 'awaiting' && !(postRole === 'follow_up' && response.checkedInAt))
    const unassigned = responses.filter(response => appearsInRosterGroup(response, postRole) && !response.groupId && !(postRole === 'follow_up' && response.checkedInAt))
    const noGroup = responses.filter(response => postRole === 'follow_up' && response.checkedInAt && !response.groupId)
    const declined = responses.filter(response => response.status === 'not_attending' && !(postRole === 'follow_up' && response.checkedInAt))
    if (pending.length) sections.push(section('Awaiting response', pending, postRole, timezone))
    if (unassigned.length) sections.push(section('Awaiting group choice', unassigned, postRole, timezone))
    if (noGroup.length) sections.push(section('No group selected', noGroup, postRole, timezone))
    if (declined.length) sections.push(section('Not attending', declined, postRole, timezone))
    return sections.join('\n\n')
}
