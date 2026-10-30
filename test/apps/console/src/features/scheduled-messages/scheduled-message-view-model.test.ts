import { describe, expect, it } from 'vitest'
import type { ScheduledOccurrence, ScheduledSnapshot } from '@moc/notifications'
import { canSendScheduledOccurrence, createScheduledMessageViewModel } from '@/features/scheduled-messages/scheduled-message-view-model'
import { createScheduledMessageDraft, type ScheduledMessageDraft } from '@/features/scheduled-messages/scheduled-message-drafts'
import { createScheduledMessagePayload } from '@/features/scheduled-messages/scheduled-message-payload'

function destinationModel(groups: ScheduledSnapshot['groups'], overrides: Partial<ScheduledMessageDraft> = {}) {
    const snapshot: ScheduledSnapshot = { workspaceTimezone: 'UTC', schedules: [], occurrences: [], memberTypes: [], members: [], groups }
    const draft = { ...createScheduledMessageDraft('UTC'), body: '<p>Welcome</p>', sendMode: 'now' as const, ...overrides }
    const view = createScheduledMessageViewModel(snapshot, draft, null, null, { field: 'body', value: '' }, null, [], [], [], [])
    return { draft, view }
}

const destinationGroups: ScheduledSnapshot['groups'] = [
    { chat_id: '-1001', title: 'Culture', telegram_group_topics: [{ thread_id: 42, name: 'Announcements', closed: false }, { thread_id: 43, name: 'Archived', closed: true }] },
    { chat_id: '-1002', title: 'Education', telegram_group_topics: [{ thread_id: 42, name: 'Lessons', closed: false }] },
]

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

describe('scheduled message destinations', () => {
    it('offers whole groups and each open topic together in the destination list', () => {
        const { view } = destinationModel(destinationGroups)
        expect(view.destinationItems).toEqual([
            { value: '-1001:main', label: 'Culture', groupChatId: '-1001', threadId: null },
            { value: '-1001:42', label: 'Culture › Announcements', groupChatId: '-1001', threadId: 42 },
            { value: '-1002:main', label: 'Education', groupChatId: '-1002', threadId: null },
            { value: '-1002:42', label: 'Education › Lessons', groupChatId: '-1002', threadId: 42 },
        ])
        expect(view.selectedDestination).toBeUndefined()
    })

    it('keeps topics scoped to their group even when thread IDs match', () => {
        const { view, draft } = destinationModel(destinationGroups, { groupChatId: '-1002', threadId: '42' })
        expect(view.selectedDestination?.label).toBe('Education › Lessons')
        expect(createScheduledMessagePayload(draft, 'UTC')).toMatchObject({ groupChatId: '-1002', threadId: 42 })
    })

    it('keeps group-only delivery available without carrying a previous topic', () => {
        const { view, draft } = destinationModel(destinationGroups, { groupChatId: '-1001', threadId: '' })
        expect(view.selectedDestination?.label).toBe('Culture')
        expect(createScheduledMessagePayload(draft, 'UTC')).toMatchObject({ groupChatId: '-1001', threadId: null })
    })

    it('does not accept a draft destination after its topic is closed or group is unavailable', () => {
        expect(destinationModel(destinationGroups, { groupChatId: '-1001', threadId: '43' }).view.selectedDestination).toBeUndefined()
        expect(destinationModel(destinationGroups, { groupChatId: '-1003', threadId: '42' }).view.selectedDestination).toBeUndefined()
    })
})
