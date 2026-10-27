import { describe, expect, it } from 'vitest'
import { createScheduledMessagePayload, followUpMinutes, type NewMessageDraft } from '../../../../../../apps/console/src/features/scheduled-messages/scheduled-message-payload'

function draft(overrides: Partial<NewMessageDraft> = {}): NewMessageDraft {
    return {
        messageType: 'announcement',
        body: '<p>Welcome on {{date:2026-10-04}} at {{time:07:30}}</p>',
        attendanceGroups: [],
        attendeeIds: [],
        groupChatId: '-100123',
        threadId: '42',
        sendMode: 'scheduled',
        startsOn: '2026-10-03T18:15',
        frequency: 'once',
        untilOn: '',
        followUpAmount: '24',
        followUpUnit: 'hours',
        ...overrides,
    }
}

describe('createScheduledMessagePayload', () => {
    it('creates an immediate attendance message with only the strict common fields and sendNow discriminator', () => {
        const payload = createScheduledMessagePayload(draft({
            messageType: 'attendance',
            sendMode: 'now',
            attendeeIds: ['member-b', 'member-a'],
            attendanceGroups: [{ id: '10000000-0000-4000-8000-000000000001', label: 'First' }, { id: '10000000-0000-4000-8000-000000000002', label: 'Second' }],
            followUpAmount: '2',
            followUpUnit: 'days',
        }), 'America/New_York')

        expect(payload).toEqual({
            messageType: 'attendance',
            body: '<p>Welcome on {{date:2026-10-04}} at {{time:07:30}}</p>',
            attendanceGroups: [{ id: '10000000-0000-4000-8000-000000000001', label: 'First' }, { id: '10000000-0000-4000-8000-000000000002', label: 'Second' }],
            attendeeIds: ['member-b', 'member-a'],
            groupChatId: '-100123',
            threadId: 42,
            followUpMinutes: 2880,
            sendNow: true,
        })
        expect(payload).not.toHaveProperty('startsOn')
        expect(payload).not.toHaveProperty('timezone')
        expect(payload).not.toHaveProperty('autoSend')
        expect(payload).not.toHaveProperty('templateId')
    })

    it('creates a scheduled recurring announcement in the workspace timezone with no send-now flag', () => {
        const payload = createScheduledMessagePayload(draft({ frequency: 'weekly', untilOn: '2026-10-25' }), 'Africa/Johannesburg')
        expect(payload).toEqual({
            messageType: 'announcement',
            body: '<p>Welcome on {{date:2026-10-04}} at {{time:07:30}}</p>',
            attendanceGroups: [],
            attendeeIds: [],
            groupChatId: '-100123',
            threadId: 42,
            followUpMinutes: null,
            startsOn: '2026-10-03T16:15:00.000Z',
            frequency: 'weekly',
            untilOn: '2026-10-25',
        })
        expect(payload).not.toHaveProperty('sendNow')
        expect(payload).not.toHaveProperty('expiresAt')
        expect(payload).not.toHaveProperty('requireArrival')
    })

    it('requires content, an attendance roster and a bounded positive follow-up offset', () => {
        expect(() => createScheduledMessagePayload(draft({ body: '<p></p>' }), 'UTC')).toThrow('Add message content')
        expect(() => createScheduledMessagePayload(draft({ messageType: 'attendance' }), 'UTC')).toThrow('Select at least one attendee')
        expect(() => followUpMinutes('0', 'hours')).toThrow()
        expect(() => followUpMinutes('366', 'days')).toThrow('one year or less')
    })
})
