import { describe, expect, test } from 'vitest'
import { renderScheduledMessage, type ScheduledRenderInput } from '../../../../packages/notifications/src/scheduled-message'

const groups = [
    { id: '10000000-0000-4000-8000-000000000001', label: 'Noon' },
    { id: '10000000-0000-4000-8000-000000000002', label: 'Evening' },
]
const input: ScheduledRenderInput = { id: 'primary', messageType: 'attendance', body: 'Service', attendanceGroups: groups }

describe('attendance group rendering', () => {
    test('places attendees in their selected group and pending and declined people separately', () => {
        const rendered = renderScheduledMessage(input, [
            { name: 'Bronwyn', status: 'awaiting', arrivalTime: null },
            { name: 'Darren', status: 'attending', arrivalTime: '11:20', groupId: groups[0].id },
            { name: 'Minnie', status: 'attending', arrivalTime: null, groupId: groups[1].id },
            { name: 'Tony', status: 'not_attending', arrivalTime: null, declineReason: 'Away' },
        ])
        expect(rendered.text).toBe('Service\n\n<b>Noon:</b>\n🔁 Darren — 11:20\n\n<b>Evening:</b>\n🔁 Minnie\n\n<b>Awaiting response:</b>\n🔁 Bronwyn\n\n<b>Not attending:</b>\n❌ Tony — Away\n\n<footer>Pre-attendance</footer>')
    })

    test('keeps empty groups visible and refuses unavailable group IDs', () => {
        expect(renderScheduledMessage(input, [{ name: 'Bronwyn', status: 'awaiting', arrivalTime: null }]).text)
            .toContain('<b>Evening:</b>\n\n<b>Awaiting response:</b>\n🔁 Bronwyn')
        expect(() => renderScheduledMessage(input, [{ name: 'Darren', status: 'attending', arrivalTime: '11:20', groupId: 'missing' }])).toThrow('Attendance group is unavailable')
    })

    test('escapes group labels and attendance text', () => {
        const rendered = renderScheduledMessage({ ...input, attendanceGroups: [{ ...groups[0], label: '<Noon & lunch>' }, groups[1]] }, [
            { name: '<Darren>', status: 'attending', arrivalTime: '11:20', groupId: groups[0].id },
        ])
        expect(rendered.text).toContain('<b>&lt;Noon &amp; lunch&gt;:</b>\n🔁 &lt;Darren&gt; — 11:20')
    })

    test('follow-up lets actual check-in win over a prior decline', () => {
        const rendered = renderScheduledMessage({ ...input, id: 'child', postRole: 'follow_up', timezone: 'UTC' }, [
            { name: 'Lee', status: 'not_attending', arrivalTime: null, declineReason: 'Away', checkedInAt: '2026-10-04T06:05:00Z' },
            { name: 'Sam', status: 'awaiting', arrivalTime: null, checkedInAt: '2026-10-04T06:10:00Z' },
        ])
        expect(rendered.text).toContain('✅ Lee — 06:05')
        expect(rendered.text).not.toContain('Away')
        expect(rendered.text).toContain('<b>No group selected:</b>\n✅ Lee — 06:05\n✅ Sam — 06:10')
        expect(rendered.text).not.toContain('Awaiting group choice')
    })
})
