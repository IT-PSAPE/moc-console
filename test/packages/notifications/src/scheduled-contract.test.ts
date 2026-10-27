import { expect, test } from 'vitest'
import { scheduledMessageLabel, scheduledOccurrenceSummary, type ScheduledOccurrence } from '../../../../packages/notifications/src/scheduled-contract'

test('derives a compact readable list label from rich body content', () => {
    expect(scheduledMessageLabel('<b>Sunday service</b> &amp; lunch\nMore details')).toBe('Sunday service & lunch')
    expect(scheduledMessageLabel('<b>')).toBe('Message')
})

test('summarizes message state without expiry data', () => {
    const occurrence: ScheduledOccurrence = {
        id: 'primary', workspace_id: 'workspace', schedule_id: 'schedule', occurrence_on: '2026-10-04', send_on: '2026-10-04T05:00:00Z',
        post_role: 'primary', parent_occurrence_id: null, legacy_closed: false, message_type: 'announcement', body: 'Service',
        attendee_ids: [], attendance_groups: [], state: 'sent', revision: 2, synced_revision: 1, telegram_message_id: 7, last_sync_error: null,
    }
    expect(scheduledOccurrenceSummary(occurrence)).toBe('2026-10-04T05:00:00Z · sent · Telegram update pending')
})
