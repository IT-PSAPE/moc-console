import { describe, expect, it } from 'vitest'
import { scheduledMessagePreview } from '../../../../../../apps/console/src/features/scheduled-messages/scheduled-message-preview'

const members = [
    { id: 'member-b', name: 'Beta', memberTypeId: 'type-a' },
    { id: 'member-a', name: 'Alpha', memberTypeId: 'type-a' },
]

describe('scheduledMessagePreview', () => {
    it('uses the renderer keyboard and preserves the selected attendee order', () => {
        const preview = scheduledMessagePreview({
            id: 'occurrence-1', messageType: 'pre_attendance', body: '{{title}}', fields: { title: 'Service' },
            requireArrival: true, audience: [],
        }, members, ['member-b', 'member-a'])

        expect(preview.replyMarkup).toEqual({ inline_keyboard: [[
            { text: 'Attending', callback_data: 'sa:yes:occurrence-1' },
            { text: 'Not attending', callback_data: 'sa:no:occurrence-1' },
        ]] })
        expect(preview.html).toBe('<p>Service</p>\n<p>🔁 Beta<br>🔁 Alpha</p>')
        expect(preview.attendeeCount).toBe(2)
    })

    it('returns no keyboard for announcements', () => {
        const preview = scheduledMessagePreview({
            id: 'announcement-1', messageType: 'announcement', body: '{{title}}', fields: { title: 'Service' },
            requireArrival: false, audience: [],
        }, members)

        expect(preview.replyMarkup).toBeNull()
        expect(preview.html).toBe('<p>Service</p>')
        expect(preview.attendeeCount).toBe(0)
    })

    it('returns no keyboard when rendering fails', () => {
        const preview = scheduledMessagePreview({
            id: 'announcement-1', messageType: 'announcement', body: 'x'.repeat(5000), fields: { title: 'Service' },
            requireArrival: false, audience: [],
        }, members)

        expect(preview.error).toContain('Telegram’s text limit')
        expect(preview.html).toBe('')
        expect(preview.replyMarkup).toBeNull()
    })
})
