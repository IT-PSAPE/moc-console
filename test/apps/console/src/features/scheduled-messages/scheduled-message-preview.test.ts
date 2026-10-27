import { describe, expect, it } from 'vitest'
import { scheduledMessagePreview } from '../../../../../../apps/console/src/features/scheduled-messages/scheduled-message-preview'

const members = [
    { id: 'member-b', name: 'Beta', memberTypeId: 'type-a' },
    { id: 'member-a', name: 'Alpha', memberTypeId: 'type-a' },
    { id: 'member-c', name: 'Gamma', memberTypeId: 'type-a' },
]

describe('scheduledMessagePreview', () => {
    it('renders the selected attendance roster in order with primary actions', () => {
        const preview = scheduledMessagePreview({
            id: 'occurrence-1', messageType: 'attendance', postRole: 'primary', body: '<p>Service</p>',
        }, members, ['member-b', 'member-a'])

        expect(preview.replyMarkup).toEqual({ inline_keyboard: [[
            { text: 'Attending', style: 'primary', callback_data: 'sa:yes:occurrence-1' },
            { text: 'Not attending', callback_data: 'sa:no:occurrence-1' },
        ]] })
        expect(preview.html).toBe('<p>Service</p>\n<p>🔁 Beta<br>🔁 Alpha</p>')
        expect(preview.attendeeCount).toBe(2)
        expect(preview.footerLabel).toBe('Pre-attendance')
    })

    it('previews the separate Attendance follow-up action', () => {
        const preview = scheduledMessagePreview({
            id: 'follow-up-1', messageType: 'attendance', postRole: 'follow_up', body: '<p>Service</p>',
        }, members, ['member-a'])

        expect(preview.replyMarkup).toEqual({ inline_keyboard: [[{ text: 'Attended', style: 'success', callback_data: 'sa:check:follow-up-1' }]] })
        expect(preview.html).toBe('<p>Service</p>\n<p>🔁 Alpha</p>')
        expect(preview.footerLabel).toBe('Attendance')
    })

    it('starts a roster-only preview with selected attendees when the editor body is empty', () => {
        const preview = scheduledMessagePreview({
            id: 'roster-only',
            messageType: 'attendance',
            postRole: 'primary',
            body: '<p></p>',
            attendanceGroups: [
                { id: '11111111-1111-4111-8111-111111111111', label: 'Early' },
                { id: '22222222-2222-4222-8222-222222222222', label: 'Late' },
            ],
        }, members, ['member-a', 'member-b', 'member-c'])

        expect(preview.html).toBe('<p><b>Early:</b></p>\n<p><b>Late:</b></p>\n<p><b>Awaiting response:</b><br>🔁 Alpha<br>🔁 Beta<br>🔁 Gamma</p>')
        expect(preview.html).not.toMatch(/^<p><\/p>/)
        expect(preview.attendeeCount).toBe(3)
    })

    it('preserves rich body markup before grouped attendance content', () => {
        const body = '<h2>Service plan</h2><p><strong>Meet at 10:00</strong></p><p>Bring <em>water</em>.</p>'
        const preview = scheduledMessagePreview({
            id: 'grouped-rich',
            messageType: 'attendance',
            postRole: 'primary',
            body,
            attendanceGroups: [
                { id: '11111111-1111-4111-8111-111111111111', label: 'Early' },
                { id: '22222222-2222-4222-8222-222222222222', label: 'Late' },
            ],
        }, members, ['member-a', 'member-c'])

        expect(preview.html).toBe('<h2>Service plan</h2><p><strong>Meet at 10:00</strong></p><p>Bring <em>water</em>.</p>\n<p><b>Early:</b></p>\n<p><b>Late:</b></p>\n<p><b>Awaiting response:</b><br>🔁 Alpha<br>🔁 Gamma</p>')
    })

    it('returns no keyboard for announcements and safe errors for invalid content', () => {
        const announcement = scheduledMessagePreview({ id: 'announcement-1', messageType: 'announcement', body: '<p><b>Service</b></p>' }, members, [])
        expect(announcement.replyMarkup).toBeNull()
        expect(announcement.html).toBe('<p><b>Service</b></p>')
        expect(announcement.attendeeCount).toBe(0)
        expect(announcement.footerLabel).toBeNull()

        const invalid = scheduledMessagePreview({ id: 'bad', messageType: 'announcement', body: 'x'.repeat(5000) }, members, [])
        expect(invalid.error).toContain('1–3000 characters')
        expect(invalid.html).toBe('')
        expect(invalid.replyMarkup).toBeNull()
        expect(invalid.footerLabel).toBeNull()
    })
})
