import { expect, test } from 'bun:test'
import { renderScheduledMessage, validateScheduledBody, validateScheduledFields } from '../../../../packages/notifications/src/scheduled-message'

test('derives date and 24-hour time from expiry in the schedule timezone, ignoring a stale stored date', () => {
 const result=renderScheduledMessage({id:'abc',messageType:'announcement',body:'{{date}} {{time}}',fields:{title:'Service',date:'2025-01-01'},requireArrival:false,expiresAt:'2026-10-03T22:30:00Z',timezone:'Africa/Johannesburg'},[],false)
 expect(result.text).toBe('431004 00:30')
})
test('each recurring expiry renders its own date and time, including timezone day boundaries', () => {
 const input={id:'abc',messageType:'pre_attendance' as const,body:'{{date}} {{time}}',fields:{title:'Service'},requireArrival:false,timezone:'America/New_York'}
 expect(renderScheduledMessage({...input,expiresAt:'2026-10-04T03:15:00Z'},[],false).text).toBe('431003 23:15')
 expect(renderScheduledMessage({...input,expiresAt:'2026-10-05T03:15:00Z'},[],false).text).toBe('431004 23:15')
})
test('date and time are template variables, not independently editable fields', () => {
 validateScheduledBody('announcement','{{title}} {{date}} {{time}}')
 expect(() => validateScheduledFields('announcement',{title:'Service',date:'2026-10-04'})).toThrow()
 expect(() => validateScheduledFields('announcement',{title:'Service',time:'07:30'})).toThrow()
})
