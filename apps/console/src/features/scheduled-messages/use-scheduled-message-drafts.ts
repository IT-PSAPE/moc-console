import { useCallback, useState } from 'react'
import { DEFAULT_TIMEZONE } from '@moc/notifications'
import { createScheduledMessageDraft, initializeScheduledMessageDraft, resetScheduledMessageDraft, selectScheduledMessageDraft, updateScheduledMessageDraft, type ScheduledMessageDraft, type ScheduledMessageDraftCache } from './scheduled-message-drafts'

export function useScheduledMessageDrafts(workspaceId: string | null) {
    const [cache, setCache] = useState<ScheduledMessageDraftCache>(() => new Map())
    const [fallbackDraft] = useState(() => createScheduledMessageDraft(DEFAULT_TIMEZONE))
    const draft = selectScheduledMessageDraft(cache, workspaceId, fallbackDraft)

    const initialize = useCallback((timezone: string): void => {
        if (!workspaceId) return
        setCache(current => initializeScheduledMessageDraft(current, workspaceId, timezone))
    }, [workspaceId])

    const updateDraft = useCallback((update: (draft: ScheduledMessageDraft) => ScheduledMessageDraft): void => {
        if (!workspaceId) return
        setCache(current => updateScheduledMessageDraft(current, workspaceId, fallbackDraft, update))
    }, [fallbackDraft, workspaceId])

    const resetDraft = useCallback((timezone: string): void => {
        if (!workspaceId) return
        setCache(current => resetScheduledMessageDraft(current, workspaceId, fallbackDraft, timezone))
    }, [fallbackDraft, workspaceId])

    return {
        draft,
        isInitialized: Boolean(workspaceId && cache.has(workspaceId)),
        actions: { initialize, update: updateDraft, reset: resetDraft },
    }
}
