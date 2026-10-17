import { renderScheduledMessage, toRichHtml, type InlineKeyboardMarkup, type ScheduledMember, type ScheduledRenderInput, type ScheduledResponse } from '@moc/notifications'

export type ScheduledMessagePreview = { html: string; error: string; attendeeCount: number; replyMarkup: InlineKeyboardMarkup | null }

/** Render the draft attendee roster in the chosen order without persisting responses. */
export function scheduledMessagePreview(input: ScheduledRenderInput & { audience: string[] }, members: ScheduledMember[], attendeeIds?: string[]): ScheduledMessagePreview {
    const responses: ScheduledResponse[] = input.messageType === 'pre_attendance'
        ? (attendeeIds ? attendeeIds.map(id => members.find(member => member.id === id)).filter((member): member is ScheduledMember => Boolean(member)) : members.filter(member => input.audience.includes(member.memberTypeId)).sort((left, right) => left.name.localeCompare(right.name)))
            .map(member => ({ name: member.name, status: 'awaiting', arrivalTime: null }))
        : []
    try {
        const rendered = renderScheduledMessage(input, responses, false)
        return { html: toRichHtml(rendered.text), error: '', attendeeCount: responses.length, replyMarkup: rendered.replyMarkup }
    } catch (error) {
        return { html: '', error: error instanceof Error ? error.message : 'Check message values', attendeeCount: responses.length, replyMarkup: null }
    }
}
