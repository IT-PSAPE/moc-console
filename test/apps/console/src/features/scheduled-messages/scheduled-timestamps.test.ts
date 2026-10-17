import { expect, test } from 'vitest'
import { scheduleTimestamps, scheduledTimestamp, previewSendTime } from '../../../../../../apps/console/src/features/scheduled-messages/scheduled-timestamps'

test('converts send and expiry controls in the chosen timezone, retaining minutes across midnight', () => {
 expect(scheduleTimestamps('2026-10-03T18:15','2026-10-04T07:30','Africa/Johannesburg')).toEqual({startsOn:'2026-10-03T16:15:00.000Z',expiresAt:'2026-10-04T05:30:00.000Z'})
})
test('rejects incomplete controls, impossible dates, invalid zones and nonexistent DST times', () => {
 for (const value of ['2026-10-04T','T18:30','2026-02-30T18:30']) expect(() => scheduledTimestamp(value,'Africa/Johannesburg')).toThrow()
 expect(() => scheduledTimestamp('2026-03-08T02:30','America/New_York')).toThrow()
 expect(() => scheduledTimestamp('2026-10-04T18:30','Bad/Zone')).toThrow()
})
test('expiry must follow send and stay within the supported lifecycle', () => {
 expect(() => scheduleTimestamps('2026-10-04T18:30','2026-10-04T18:30','Africa/Johannesburg')).toThrow()
 expect(() => scheduleTimestamps('2026-10-04T18:30','2026-10-04T18:00','Africa/Johannesburg')).toThrow()
 expect(() => scheduleTimestamps('2026-10-04T18:30','2028-10-04T18:30','Africa/Johannesburg')).toThrow()
})

test('preview footer uses send time in the chosen timezone without treating it as expiry', () => {
 expect(previewSendTime('2026-10-17T18:37', 'Africa/Johannesburg')).toBe('18:37')
 expect(previewSendTime('2026-10-18T00:05', 'America/New_York')).toBe('00:05')
})

test('preview footer stays empty while its time or timezone is incomplete', () => {
 expect(previewSendTime('', 'Africa/Johannesburg')).toBe('')
 expect(previewSendTime('2026-10-17T18:37', 'Bad/Zone')).toBe('')
})
