import { beforeEach, expect, test, vi } from 'vitest'
import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import type { DiscussionPage, ItemComment } from '@moc/types/discussion'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'
import { useItemDiscussion } from '../../../../../../apps/console/src/features/item-discussion/use-item-discussion'
import { createItemComment } from '../../../../../../apps/console/src/data/item-discussion'

const fixture = vi.hoisted(() => ({ workspaceId: 'workspace', generation: 1, canRead: true, canComment: true, activityError: null as Error | null, commentsError: null as Error | null, options: [] as Array<{ queryKey: readonly unknown[]; enabled: boolean }> }))
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

vi.mock('react', async importOriginal => {
    const actual = await importOriginal<typeof import('react')>()
    const hooks = createMockReactModule()
    return { ...actual, ...hooks, useLayoutEffect: hooks.useEffect }
})
vi.mock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: fixture.workspaceId, role: { can_read: fixture.canRead, can_update: fixture.canComment } }) }))
vi.mock('../../../../../../apps/console/src/data/current-workspace', () => ({ getCurrentWorkspaceGeneration: () => fixture.generation }))
vi.mock('../../../../../../apps/console/src/data/item-discussion', () => ({ createItemComment: vi.fn(), fetchItemActivity: vi.fn(), fetchItemComments: vi.fn() }))
vi.mock('@tanstack/react-query', async importOriginal => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>()
    return { ...actual, useQueryClient: () => client, useInfiniteQuery: (options: { queryKey: readonly unknown[]; enabled: boolean }) => {
        fixture.options.push(options)
        const activity = String(options.queryKey[2]).startsWith('item-activity:')
        return { data: client.getQueryData(options.queryKey), error: activity ? fixture.activityError : fixture.commentsError, isPending: !client.getQueryData(options.queryKey), isFetching: false, hasNextPage: false, refetch: vi.fn(), fetchNextPage: vi.fn() }
    } }
})

const actor = { id: 'member', name: 'Craig', avatarUrl: null, kind: 'member' as const }
const comment: ItemComment = { id: 'comment', actor, body: 'A draft', origin: 'comment', itemKind: 'request', itemId: 'request', createdAt: '2026-10-26T11:00:00Z' }
const commentsKey = ['workspace', 'workspace', 'item-comments:request:request']

function runtime(): HookRuntime<boolean, ReturnType<typeof useItemDiscussion>> {
    return new HookRuntime(enabled => useItemDiscussion('request', 'request', enabled))
}

beforeEach(() => {
    client.clear()
    fixture.workspaceId = 'workspace'; fixture.generation = 1; fixture.canRead = true; fixture.canComment = true
    fixture.activityError = null; fixture.commentsError = null; fixture.options = []
    vi.mocked(createItemComment).mockReset()
})

test('failed comments retain the draft and retry with the same key; success clears once and appends immediately', async () => {
    const hook = runtime()
    hook.render(true).actions.changeDraft(' A draft ')
    vi.mocked(createItemComment).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(comment)
    await hook.rerender().actions.submitComment()
    expect(hook.rerender().state).toMatchObject({ draft: ' A draft ', submitError: 'Offline' })
    const retryKey = vi.mocked(createItemComment).mock.calls[0][4]
    await hook.rerender().actions.submitComment()
    expect(vi.mocked(createItemComment).mock.calls[1]).toEqual(['request', 'request', 'A draft', 'workspace', retryKey])
    expect(hook.rerender().state).toMatchObject({ draft: '', submitError: null })
    expect(client.getQueryData<InfiniteData<DiscussionPage<ItemComment>>>(commentsKey)?.pages[0].items).toEqual([comment])
})

test('only the visible tab runs queries, closed panels stop, and switching tabs retains drafts', () => {
    const hook = runtime()
    const first = hook.render(true)
    expect(fixture.options.slice(-2).map(option => option.enabled)).toEqual([true, false])
    first.actions.changeDraft('Draft to retain')
    first.actions.changeTab('comments')
    expect(hook.rerender().state.draft).toBe('Draft to retain')
    expect(fixture.options.slice(-2).map(option => option.enabled)).toEqual([false, true])
    hook.render(false)
    expect(fixture.options.slice(-2).map(option => option.enabled)).toEqual([false, false])
})

test('comments retain cached content when refresh fails independently of activity', () => {
    client.setQueryData(commentsKey, { pages: [{ items: [comment], nextCursor: null }], pageParams: [undefined] })
    fixture.commentsError = new Error('Refresh failed')
    const result = runtime().render(true)
    expect(result.state.comments.map(row => row.body)).toEqual(['A draft'])
    expect(result.state.commentsError).toBe('Refresh failed')
    expect(result.state.activityError).toBeNull()
})

test('read-only members cannot comment and stale-session submissions cannot repopulate cache', async () => {
    fixture.canComment = false
    const readOnly = runtime()
    readOnly.render(true).actions.changeDraft('No access')
    await readOnly.rerender().actions.submitComment()
    expect(createItemComment).not.toHaveBeenCalled()
    fixture.canComment = true
    const hook = runtime()
    hook.render(true).actions.changeDraft('A draft')
    vi.mocked(createItemComment).mockImplementation(async () => { fixture.generation += 1; return comment })
    await hook.rerender().actions.submitComment()
    expect(client.getQueryData(commentsKey)).toBeUndefined()
})

test('scheduled-message management access uses update permission and closed panels cannot submit', async () => {
    fixture.canRead = false
    const manager = new HookRuntime((enabled: boolean) => useItemDiscussion('scheduled-message', 'occurrence', enabled))
    expect(manager.render(true).meta.canRead).toBe(true)
    expect(fixture.options.slice(-2).map(option => option.enabled)).toEqual([true, false])
    manager.render(false).actions.changeDraft('A closed draft')
    await manager.rerender().actions.submitComment()
    expect(createItemComment).not.toHaveBeenCalled()
    fixture.canComment = false
    fixture.canRead = true
    expect(manager.render(true).meta.canRead).toBe(false)
})
