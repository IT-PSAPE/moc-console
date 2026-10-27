import { describe, expect, it } from 'vitest'
import { createScheduledMessageDraft, initializeScheduledMessageDraft, resetScheduledMessageDraft, selectScheduledMessageDraft, updateScheduledMessageDraft, type ScheduledMessageDraftCache } from '@/features/scheduled-messages/scheduled-message-drafts'

describe('workspace-scoped message drafts', () => {
    it('restores each workspace draft without displaying another workspace draft', () => {
        const fallback = createScheduledMessageDraft('Africa/Johannesburg')
        let cache: ScheduledMessageDraftCache = new Map()
        cache = initializeScheduledMessageDraft(cache, 'workspace-a', 'Africa/Johannesburg')
        cache = updateScheduledMessageDraft(cache, 'workspace-a', fallback, draft => ({ ...draft, body: '<p>Workspace A</p>', attendeeIds: ['member-a'] }))
        cache = initializeScheduledMessageDraft(cache, 'workspace-b', 'Europe/London')

        expect(selectScheduledMessageDraft(cache, 'workspace-b', fallback).body).toBe('<p></p>')
        expect(selectScheduledMessageDraft(cache, 'workspace-a', fallback)).toMatchObject({ body: '<p>Workspace A</p>', attendeeIds: ['member-a'] })
        expect(selectScheduledMessageDraft(cache, 'workspace-c', fallback)).toBe(fallback)
        expect(initializeScheduledMessageDraft(cache, 'workspace-a', 'UTC')).toBe(cache)
    })

    it('resets only the selected workspace draft', () => {
        const fallback = createScheduledMessageDraft('Africa/Johannesburg')
        let cache = initializeScheduledMessageDraft(new Map(), 'workspace-a', 'Africa/Johannesburg')
        cache = updateScheduledMessageDraft(cache, 'workspace-a', fallback, draft => ({ ...draft, body: '<p>Keep A</p>' }))
        cache = initializeScheduledMessageDraft(cache, 'workspace-b', 'Europe/London')
        cache = resetScheduledMessageDraft(cache, 'workspace-b', fallback, 'Europe/London')

        expect(selectScheduledMessageDraft(cache, 'workspace-a', fallback).body).toBe('<p>Keep A</p>')
        expect(selectScheduledMessageDraft(cache, 'workspace-b', fallback).body).toBe('<p></p>')
    })
})
