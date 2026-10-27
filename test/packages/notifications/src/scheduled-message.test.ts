import { describe, expect, test } from 'vitest'
import { renderScheduledMessage, validateScheduledBody, type ScheduledRenderInput, type ScheduledResponse } from '../../../../packages/notifications/src/scheduled-message'

describe('scheduled message content and rendering', () => {
    test('renders explicit date and 24-hour time values without schedule inputs', () => {
        const input: ScheduledRenderInput = {
            id: 'announcement-1',
            messageType: 'announcement',
            body: '<b>Service</b>\n{{date:2026-10-04}} at {{time:07:30}}',
        }
        validateScheduledBody(input.messageType, input.body)
        expect(renderScheduledMessage(input, []).text).toBe('<b>Service</b>\n431004 at 07:30')
        expect(renderScheduledMessage(input, []).replyMarkup).toBeNull()
    })

    test('rejects retired template variables and malformed or invalid typed values', () => {
        for (const body of [
            '{{title}}',
            '{{date}} {{time}}',
            '{{date:2025-02-29}}',
            '{{date:2024-02-30}}',
            '{{time:24:00}}',
            '{{time:12:60}}',
            '{{date:2026-10-04}',
        ]) {
            expect(() => validateScheduledBody('announcement', body)).toThrow()
        }
    })

    test('renders expanded legacy rich bodies over the new-write limit up to Telegram visible limit', () => {
        const body = `<b>${'A'.repeat(3500)}</b>`
        expect(() => validateScheduledBody('announcement', body)).toThrow('1–3000')
        expect(renderScheduledMessage({ id: 'legacy-1', messageType: 'announcement', body }, []).text).toBe(body)
        expect(() => renderScheduledMessage({ id: 'legacy-2', messageType: 'announcement', body: 'A'.repeat(4097) }, [])).toThrow('Telegram’s text limit')
    })

    test('primary attendance uses intent icons, expected times, decline reasons, and its own actions', () => {
        const input: ScheduledRenderInput = { id: 'primary-1', messageType: 'attendance', body: 'Sunday service' }
        const responses: ScheduledResponse[] = [
            { name: 'Sam', status: 'awaiting', arrivalTime: null },
            { name: '<Alex & Jo>', status: 'attending', arrivalTime: '07:30', checkedInAt: '2026-10-04T05:15:00Z' },
            { name: 'Lee', status: 'not_attending', arrivalTime: null, declineReason: '<sick & tired>' },
        ]
        const rendered = renderScheduledMessage(input, responses)
        expect(rendered.text).toBe('Sunday service\n\n🔁 Sam\n🔁 &lt;Alex &amp; Jo&gt; — 07:30\n❌ Lee — &lt;sick &amp; tired&gt;\n\n<footer>Pre-attendance</footer>')
        expect(rendered.replyMarkup?.inline_keyboard).toEqual([[
            { text: 'Attending', style: 'primary', callback_data: 'sa:yes:primary-1' },
            { text: 'Not attending', callback_data: 'sa:no:primary-1' },
        ]])
    })

    test('follow-up shows actual check-in in workspace time and keeps intent when no check-in exists', () => {
        const input: ScheduledRenderInput = {
            id: 'child-1', messageType: 'attendance', postRole: 'follow_up', body: 'Sunday service', timezone: 'Africa/Johannesburg',
        }
        const responses: ScheduledResponse[] = [
            { name: 'Alex', status: 'attending', arrivalTime: '08:00', checkedInAt: '2026-10-04T05:15:00Z' },
            { name: 'Sam', status: 'awaiting', arrivalTime: null },
            { name: 'Lee', status: 'not_attending', arrivalTime: null, declineReason: 'Unwell' },
            { name: 'Jo', status: 'not_attending', arrivalTime: null, checkedInAt: '2026-10-04T06:05:00Z' },
        ]
        const rendered = renderScheduledMessage(input, responses)
        expect(rendered.text).toBe('Sunday service\n\n✅ Alex — 07:15\n🔁 Sam\n❌ Lee — Unwell\n✅ Jo — 08:05\n\n<footer>Attendance</footer>')
        expect(rendered.replyMarkup?.inline_keyboard).toEqual([[
            { text: 'Attended', style: 'success', callback_data: 'sa:check:child-1' },
        ]])
    })

    test('only attendance follow-ups can use the check-in action', () => {
        expect(() => renderScheduledMessage({ id: 'announcement-1', messageType: 'announcement', postRole: 'follow_up', body: 'Update' }, [])).toThrow()
        expect(() => validateScheduledBody('attendance', '   ')).toThrow()
    })

    test('closed legacy messages retain a closed suffix and have no actions', () => {
        const result = renderScheduledMessage({ id: 'old-1', messageType: 'attendance', body: 'Legacy post', legacyClosed: true }, [])
        expect(result.text).toContain('\n\nClosed')
        expect(result.replyMarkup).toBeNull()
    })
})
