import { expect, test } from 'vitest'
import { scheduledTimestamp } from '../../../../../../apps/console/src/features/scheduled-messages/scheduled-timestamps'

test('converts a scheduled send from the workspace timezone to an absolute instant', () => {
    expect(scheduledTimestamp('2026-10-03T18:15', 'Africa/Johannesburg')).toBe('2026-10-03T16:15:00.000Z')
    expect(scheduledTimestamp('2026-10-04T00:05', 'America/New_York')).toBe('2026-10-04T04:05:00.000Z')
})

test('rejects incomplete controls, impossible dates, invalid zones and nonexistent DST times', () => {
    for (const value of ['2026-10-04T', 'T18:30', '2026-02-30T18:30']) expect(() => scheduledTimestamp(value, 'Africa/Johannesburg')).toThrow()
    expect(() => scheduledTimestamp('2026-03-08T02:30', 'America/New_York')).toThrow()
    expect(() => scheduledTimestamp('2026-10-04T18:30', 'Bad/Zone')).toThrow()
})
