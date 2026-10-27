import { describe, expect, it } from 'vitest'
import type { ScheduledOccurrence } from '@moc/notifications'
import { canSendScheduledOccurrence } from '@/features/scheduled-messages/scheduled-message-view-model'

function scheduledOccurrence(postRole: ScheduledOccurrence['post_role']): ScheduledOccurrence {
    return {
        id: `message-${postRole}`,
        workspace_id: 'workspace-a',
        schedule_id: 'schedule-a',
        occurrence_on: '2026-10-27',
        send_on: '2026-10-27T10:00:00.000Z',
        post_role: postRole,
        parent_occurrence_id: postRole === 'follow_up' ? 'message-primary' : null,
        legacy_closed: false,
        message_type: 'attendance',
        body: '<p>Message</p>',
        attendee_ids: ['member-a'],
        attendance_groups: [],
        state: 'scheduled',
        revision: 1,
        synced_revision: 0,
        telegram_message_id: null,
        last_sync_error: null,
    }
}

describe('scheduled occurrence actions', () => {
    it('keeps automatically anchored follow-ups out of manual Send now actions', () => {
        expect(canSendScheduledOccurrence(scheduledOccurrence('primary'))).toBe(true)
        expect(canSendScheduledOccurrence(scheduledOccurrence('follow_up'))).toBe(false)
    })
})
