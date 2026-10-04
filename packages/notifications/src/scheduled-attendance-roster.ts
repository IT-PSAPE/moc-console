import { escapeHtml } from './template-tokens.js'
import type { ScheduledAttendanceGroup } from './scheduled-attendance-groups.js'
import type { ScheduledResponse } from './scheduled-message.js'

function attendeeLine(response: ScheduledResponse): string {
    const icon = response.status === 'attending' ? '✅' : response.status === 'not_attending' ? '❌' : '🔁'
    const arrival = response.status === 'attending' && response.arrivalTime ? ` — ${escapeHtml(response.arrivalTime)}` : ''
    return `${icon} ${escapeHtml(response.name)}${arrival}`
}
function section(label: string, responses: ScheduledResponse[]): string {
    return [`<b>${escapeHtml(label)}:</b>`, ...responses.map(attendeeLine)].join('\n')
}
export function renderScheduledAttendanceRoster(groups: ScheduledAttendanceGroup[], responses: ScheduledResponse[]): string {
    if (!groups.length) return responses.map(attendeeLine).join('\n')
    const validIds = new Set(groups.map(group => group.id))
    if (responses.some(response => response.groupId && !validIds.has(response.groupId))) throw new Error('Attendance group is unavailable')
    const sections = groups.map(group => section(group.label, responses.filter(response => response.status === 'attending' && response.groupId === group.id)))
    const pending = responses.filter(response => response.status === 'awaiting')
    const unassigned = responses.filter(response => response.status === 'attending' && !response.groupId)
    const declined = responses.filter(response => response.status === 'not_attending')
    if (pending.length) sections.push(section('Awaiting response', pending))
    if (unassigned.length) sections.push(section('Awaiting group choice', unassigned))
    if (declined.length) sections.push(section('Not attending', declined))
    return sections.join('\n\n')
}
