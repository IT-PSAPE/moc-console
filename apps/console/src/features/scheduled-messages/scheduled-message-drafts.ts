import { formatUtcIsoForDateTimeInput } from '@moc/utils/zoned-date-time'
import type { NewMessageDraft } from './scheduled-message-payload'

export type ScheduledMessageDraft = NewMessageDraft & { memberSearch: string }
export type ScheduledMessageDraftCache = ReadonlyMap<string, ScheduledMessageDraft>

export function createScheduledMessageDraft(timezone: string): ScheduledMessageDraft {
    return {
        messageType: 'announcement',
        body: '<p></p>',
        attendanceGroups: [],
        attendeeIds: [],
        memberSearch: '',
        groupChatId: '',
        threadId: '',
        sendMode: 'scheduled',
        startsOn: formatUtcIsoForDateTimeInput(new Date(Date.now() + 3600_000).toISOString(), timezone),
        frequency: 'once',
        untilOn: '',
        followUpAmount: '24',
        followUpUnit: 'hours',
    }
}

export function initializeScheduledMessageDraft(cache: ScheduledMessageDraftCache, workspaceId: string, timezone: string): ScheduledMessageDraftCache {
    if (cache.has(workspaceId)) return cache
    const next = new Map(cache)
    next.set(workspaceId, createScheduledMessageDraft(timezone))
    return next
}

export function updateScheduledMessageDraft(cache: ScheduledMessageDraftCache, workspaceId: string, fallback: ScheduledMessageDraft, update: (draft: ScheduledMessageDraft) => ScheduledMessageDraft): ScheduledMessageDraftCache {
    const next = new Map(cache)
    next.set(workspaceId, update(cache.get(workspaceId) ?? fallback))
    return next
}

export function resetScheduledMessageDraft(cache: ScheduledMessageDraftCache, workspaceId: string, fallback: ScheduledMessageDraft, timezone: string): ScheduledMessageDraftCache {
    return updateScheduledMessageDraft(cache, workspaceId, fallback, () => createScheduledMessageDraft(timezone))
}

export function selectScheduledMessageDraft(cache: ScheduledMessageDraftCache, workspaceId: string | null, fallback: ScheduledMessageDraft): ScheduledMessageDraft {
    return workspaceId ? cache.get(workspaceId) ?? fallback : fallback
}
