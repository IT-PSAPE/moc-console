import { useCallback, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { DiscussionPage, ItemActivity, ItemComment, ItemKind } from '@moc/types/discussion'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { createItemComment, fetchItemActivity, fetchItemComments } from '@/data/item-discussion'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { workspaceResourceKey } from '@/data/workspace-resource-cache'
import { consoleQueryPolicy } from '@/lib/console-query-policy'
import { useWorkspace } from '@/lib/workspace-context'
import { formatItemComments, groupItemActivity } from './activity-formatters'
import { useDiscussionCommentScroll } from './use-discussion-comment-scroll'

export function useItemDiscussion(kind: ItemKind, itemId: string, enabled: boolean) {
    const { currentWorkspaceId, role } = useWorkspace()
    const client = useQueryClient()
    const generation = getCurrentWorkspaceGeneration()
    const [tab, setTab] = useState('activity')
    const [draft, setDraft] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const attempt = useRef<{ body: string; key: string } | null>(null)
    const submitting = useRef(false)
    const activityKey = workspaceResourceKey(currentWorkspaceId, `item-activity:${kind}:${itemId}`)
    const commentsKey = workspaceResourceKey(currentWorkspaceId, `item-comments:${kind}:${itemId}`)
    const canRead = kind === 'scheduled-message' ? role?.can_update === true : role?.can_read === true
    const canComment = enabled && canRead && role?.can_update === true
    const ready = enabled && canRead && Boolean(currentWorkspaceId && itemId)

    const activity = useInfiniteQuery({
        ...consoleQueryPolicy('item-activity'),
        queryKey: activityKey,
        queryFn: loadActivity,
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextActivityCursor,
        enabled: ready && tab === 'activity',
    })
    const comments = useInfiniteQuery({
        ...consoleQueryPolicy('item-comments'),
        queryKey: commentsKey,
        queryFn: loadComments,
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextCommentCursor,
        enabled: ready && tab === 'comments',
    })
    const visibleComments = formatItemComments(comments.data?.pages.flatMap(pageItems) ?? [])
    const commentsScroll = useDiscussionCommentScroll(visibleComments.length, visibleComments.at(-1)?.id ?? null, tab === 'comments')

    function loadActivity({ pageParam }: { pageParam: string | undefined }): Promise<DiscussionPage<ItemActivity>> {
        if (!currentWorkspaceId) throw new Error('Select a workspace')
        return fetchItemActivity(kind, itemId, currentWorkspaceId, pageParam)
    }

    function loadComments({ pageParam }: { pageParam: string | undefined }): Promise<DiscussionPage<ItemComment>> {
        if (!currentWorkspaceId) throw new Error('Select a workspace')
        return fetchItemComments(kind, itemId, currentWorkspaceId, pageParam)
    }

    const changeDraft = useCallback((value: string): void => {
        setDraft(value)
        setSubmitError(null)
    }, [])

    async function submitComment(): Promise<void> {
        const body = draft.trim()
        if (!body || !currentWorkspaceId || !canComment || submitting.current || body.length > 10_000) return
        const workspaceId = currentWorkspaceId
        if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() }
        submitting.current = true
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            const comment = await createItemComment(kind, itemId, body, workspaceId, attempt.current.key)
            if (getCurrentWorkspaceGeneration() !== generation) return
            commentsScroll.followLatest()
            client.setQueryData<InfiniteData<DiscussionPage<ItemComment>>>(commentsKey, appendComment)
            setDraft('')
            attempt.current = null
            void client.invalidateQueries({ queryKey: commentsKey })
            void client.invalidateQueries({ queryKey: activityKey })

            function appendComment(current: InfiniteData<DiscussionPage<ItemComment>> | undefined): InfiniteData<DiscussionPage<ItemComment>> {
                if (!current?.pages.length) return { pages: [{ items: [comment], nextCursor: null }], pageParams: [undefined] }
                const first = current.pages[0]
                return { ...current, pages: [{ ...first, items: [comment, ...first.items.filter(excludeComment)] }, ...current.pages.slice(1)] }
                function excludeComment(candidate: ItemComment): boolean { return candidate.id !== comment.id }
            }
        } catch (error) {
            if (getCurrentWorkspaceGeneration() === generation) setSubmitError(getErrorMessage(error, 'Your comment could not be sent. Your draft is saved here.'))
        } finally {
            submitting.current = false
            setIsSubmitting(false)
        }
    }

    function refreshActivity(): void { void activity.refetch() }
    function refreshComments(): void { void comments.refetch() }
    function loadMoreActivity(): void { if (!activity.isFetching) void activity.fetchNextPage() }
    function loadOlderComments(): void {
        if (comments.isFetching) return
        commentsScroll.preserveOlderPosition()
        void comments.fetchNextPage()
    }

    return {
        state: {
            tab, draft, isSubmitting, submitError,
            activityGroups: groupItemActivity(activity.data?.pages.flatMap(pageItems) ?? []),
            comments: visibleComments,
            activityLoading: ready && activity.isPending,
            commentsLoading: ready && comments.isPending,
            activityError: activity.error ? getErrorMessage(activity.error, 'The activity could not be loaded.') : null,
            commentsError: comments.error ? getErrorMessage(comments.error, 'The comments could not be loaded.') : null,
            activityFetching: activity.isFetching,
            commentsFetching: comments.isFetching,
            hasMoreActivity: activity.hasNextPage,
            hasOlderComments: comments.hasNextPage,
        },
        actions: { changeTab: setTab, changeDraft, submitComment, refreshActivity, refreshComments, loadMoreActivity, loadOlderComments },
        meta: { canRead, canComment, commentsScrollRef: commentsScroll.viewportRef },
    }
}

function nextActivityCursor(page: DiscussionPage<ItemActivity>): string | undefined { return page.nextCursor ?? undefined }
function nextCommentCursor(page: DiscussionPage<ItemComment>): string | undefined { return page.nextCursor ?? undefined }
function pageItems<T>(page: DiscussionPage<T>): T[] { return page.items }
