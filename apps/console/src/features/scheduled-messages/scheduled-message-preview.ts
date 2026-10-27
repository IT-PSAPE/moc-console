import { renderScheduledMessage, toRichHtml, validateScheduledBody, type InlineKeyboardMarkup, type ScheduledMember, type ScheduledRenderInput, type ScheduledResponse } from '@moc/notifications'

export type ScheduledMessagePreview = { html: string; error: string; attendeeCount: number; replyMarkup: InlineKeyboardMarkup | null; footerLabel: string | null }

function scheduledFooterLabel(input: ScheduledRenderInput): string | null {
    if (input.messageType !== 'attendance') return null
    const phase = input.postRole === 'follow_up' ? 'Attendance' : 'Pre-attendance'
    return input.legacyClosed ? `${phase} · Closed` : phase
}

function removeGeneratedFooter(text: string, input: ScheduledRenderInput): string {
    let content = text
    if (input.legacyClosed && content.endsWith('\n\nClosed')) content = content.slice(0, -'\n\nClosed'.length)
    const phase = scheduledFooterLabel({ ...input, legacyClosed: false })
    const generatedFooter = phase ? `\n\n<footer>${phase}</footer>` : ''
    return generatedFooter && content.endsWith(generatedFooter) ? content.slice(0, -generatedFooter.length) : content
}

function isEmptyEditorBody(body: string): boolean {
    return /^<p>(?:\s|<br\s*\/?\s*>|&nbsp;|&#160;)*<\/p>$/i.test(body.trim())
}

function removeEmptyEditorParagraph(text: string, body: string): string {
    if (!isEmptyEditorBody(body)) return text
    const prefix = `${body.trim()}\n\n`
    return text.startsWith(prefix) ? text.slice(prefix.length) : text
}

/** Render a message draft with the explicitly ordered attendee roster. */
export function scheduledMessagePreview(input: ScheduledRenderInput, members: ScheduledMember[], attendeeIds: string[]): ScheduledMessagePreview {
    const responses: ScheduledResponse[] = input.messageType === 'attendance'
        ? attendeeIds.map(id => members.find(member => member.id === id)).filter((member): member is ScheduledMember => Boolean(member)).map(member => ({ name: member.name, status: 'awaiting', arrivalTime: null }))
        : []
    try {
        validateScheduledBody(input.messageType, input.body)
        const rendered = renderScheduledMessage(input, responses)
        const content = removeGeneratedFooter(rendered.text, input)
        return { html: toRichHtml(removeEmptyEditorParagraph(content, input.body)), error: '', attendeeCount: responses.length, replyMarkup: rendered.replyMarkup, footerLabel: scheduledFooterLabel(input) }
    } catch (error) {
        return { html: '', error: error instanceof Error ? error.message : 'Check message values', attendeeCount: responses.length, replyMarkup: null, footerLabel: null }
    }
}
