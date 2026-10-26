import { useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { ScheduledOccurrence, ScheduledSnapshot } from '@moc/notifications'
import { workspaceResourceKey } from '@/data/workspace-resource-cache'
import { consoleQueryPolicy } from '@/lib/console-query-policy'
import { useWorkspace } from '@/lib/workspace-context'
import { fetchScheduledMessages } from './services/scheduled-message-service'

const empty: ScheduledSnapshot = { templates: [], schedules: [], occurrences: [], memberTypes: [], groups: [], members: [] }

export function useScheduledMessageHistory(enabled: boolean) {
    const { currentWorkspaceId, role } = useWorkspace()
    const ready = Boolean(currentWorkspaceId) && role?.can_update === true && enabled
    const query = useInfiniteQuery({
        ...consoleQueryPolicy('scheduled-messages'),
        queryKey: workspaceResourceKey(currentWorkspaceId, 'scheduled-messages:history-pages'),
        queryFn: loadPage,
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextCursor,
        enabled: ready,
    })
    const { refetch } = query
    const load = useCallback(async (): Promise<void> => { await refetch() }, [refetch])

    function loadPage({ pageParam }: { pageParam: string | undefined }): Promise<ScheduledSnapshot> {
        if (!currentWorkspaceId) throw new Error('Select a workspace')
        return fetchScheduledMessages(currentWorkspaceId, 'history', pageParam)
    }
    function loadMore(): void {
        if (ready && query.hasNextPage && !query.isFetching) void query.fetchNextPage()
    }

    const pages = query.data?.pages ?? []
    const first = pages[0] ?? empty
    return {
        data: { ...first, occurrences: historyOccurrences(pages) },
        error: query.data === undefined ? query.error : null,
        pageError: query.data !== undefined ? query.error : null,
        isLoading: ready && query.isPending,
        isInitialLoading: ready && query.isPending,
        hasData: query.data !== undefined,
        hasMore: query.hasNextPage,
        isLoadingMore: query.isFetchingNextPage,
        load,
        loadMore,
    }
}

function nextCursor(page: ScheduledSnapshot): string | undefined { return page.nextHistoryCursor ?? undefined }
function historyOccurrences(pages: ScheduledSnapshot[]): ScheduledOccurrence[] {
    const seen = new Set<string>()
    const occurrences: ScheduledOccurrence[] = []
    for (const page of pages) {
        for (const occurrence of page.occurrences) {
            if (!seen.has(occurrence.id)) {
                seen.add(occurrence.id)
                occurrences.push(occurrence)
            }
        }
    }
    return occurrences
}
