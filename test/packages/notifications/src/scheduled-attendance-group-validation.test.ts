import { expect, test } from 'bun:test'
import * as notifications from '../../../../packages/notifications/src/index'

const groups = [
    { id: '10000000-0000-4000-8000-000000000001', label: 'Noon' },
    { id: '10000000-0000-4000-8000-000000000002', label: 'Evening' },
]
test('normalizes group labels while retaining stable identifiers', () => {
    expect(notifications.validateScheduledAttendanceGroups('pre_attendance', [{ ...groups[0], label: ' Noon ' }, groups[1]])).toEqual(groups)
    expect(notifications.validateScheduledAttendanceGroups('announcement', [])).toEqual([])
})
test.each([
    null, {}, 'Noon', [groups[0]], [...groups, ...Array.from({ length: 7 }, (_, index) => ({ id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`, label: `Group ${index}` }))],
    [groups[0], { ...groups[1], label: 'noon' }], [groups[0], { ...groups[1], label: '' }],
    [groups[0], { ...groups[1], label: 'x'.repeat(41) }], [groups[0], { ...groups[1], id: groups[0].id }],
    [groups[0], { ...groups[1], id: 'group:forged' }], [groups[0], { ...groups[1], other: 'unexpected' }],
])('rejects unusable group configuration %#', value => {
    expect(() => notifications.validateScheduledAttendanceGroups('pre_attendance', value)).toThrow()
})
test('does not configure attendee groups for announcements', () => {
    expect(() => notifications.validateScheduledAttendanceGroups('announcement', groups)).toThrow()
})
