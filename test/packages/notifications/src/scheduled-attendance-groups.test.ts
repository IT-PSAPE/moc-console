import { describe, expect, test } from 'bun:test'
import { renderScheduledMessage } from '../../../../packages/notifications/src/scheduled-message'

const groups = [
    { id: '10000000-0000-4000-8000-000000000001', label: 'Noon' },
    { id: '10000000-0000-4000-8000-000000000002', label: 'Evening' },
]
const input = { id: 'message', messageType: 'pre_attendance' as const, body: '{{title}}', fields: { title: 'Service' }, requireArrival: true, attendanceGroups: groups }

describe('attendee-selected group rendering', () => {
    test('places responding attendees in their chosen group and pending and declined people separately', () => {
        const rendered = renderScheduledMessage(input, [
            { name: 'Bronwyn', status: 'awaiting', arrivalTime: null, groupId: null },
            { name: 'Darren', status: 'attending', arrivalTime: '11:20', groupId: groups[0].id },
            { name: 'Minnie', status: 'attending', arrivalTime: null, groupId: groups[1].id },
            { name: 'Tony', status: 'not_attending', arrivalTime: null, groupId: null },
        ], false)
        expect(rendered.text).toBe('Service\n\n<b>Noon:</b>\n✅ Darren — 11:20\n\n<b>Evening:</b>\n✅ Minnie\n\n<b>Awaiting response:</b>\n🔁 Bronwyn\n\n<b>Not attending:</b>\n❌ Tony')
        expect(rendered.replyMarkup?.inline_keyboard.flat().map(button => button.text)).toEqual(['Attending', 'Not attending'])
    })
    test('keeps empty groups visible without assigning pending people', () => {
        expect(renderScheduledMessage(input, [{ name: 'Bronwyn', status: 'awaiting', arrivalTime: null }], false).text)
            .toBe('Service\n\n<b>Noon:</b>\n\n<b>Evening:</b>\n\n<b>Awaiting response:</b>\n🔁 Bronwyn')
    })
    test('keeps existing attendance visible when groups are added after a response', () => {
        expect(renderScheduledMessage(input, [{ name: 'Darren', status: 'attending', arrivalTime: '11:20' }], false).text)
            .toContain('<b>Awaiting group choice:</b>\n✅ Darren — 11:20')
    })
    test('escapes group labels and attendee values and closes expired group actions', () => {
        const rendered = renderScheduledMessage({ ...input, attendanceGroups: [{ ...groups[0], label: '<Noon & lunch>' }, groups[1]] }, [{ name: '<Darren>', status: 'attending', arrivalTime: '11:20', groupId: groups[0].id }], true)
        expect(rendered.text).toContain('<b>&lt;Noon &amp; lunch&gt;:</b>\n✅ &lt;Darren&gt; — 11:20')
        expect(rendered.text).toEndWith('Closed')
        expect(rendered.replyMarkup).toBeNull()
    })
    test('refuses to hide a response referencing an unavailable group', () => {
        expect(() => renderScheduledMessage(input, [{ name: 'Darren', status: 'attending', arrivalTime: null, groupId: 'missing' }], false)).toThrow('Attendance group is unavailable')
    })
})
