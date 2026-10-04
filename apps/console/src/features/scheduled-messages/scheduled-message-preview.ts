import { renderScheduledMessage, toRichHtml, type ScheduledMember, type ScheduledRenderInput, type ScheduledResponse } from '@moc/notifications'

/** Mirror the send-time member-type roster without persisting draft responses. */
export function scheduledMessagePreview(input: ScheduledRenderInput & { audience: string[] }, members: ScheduledMember[]): { html: string; error: string; attendeeCount: number } {
    const responses: ScheduledResponse[] = input.messageType === 'pre_attendance'
        ? members.filter(member => input.audience.includes(member.memberTypeId))
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(member => ({ name: member.name, status: 'awaiting', arrivalTime: null }))
        : []
    try {
        return { html: toRichHtml(renderScheduledMessage(input, responses, false).text), error: '', attendeeCount: responses.length }
    } catch (error) {
        return { html: '', error: error instanceof Error ? error.message : 'Check message values', attendeeCount: responses.length }
    }
}
