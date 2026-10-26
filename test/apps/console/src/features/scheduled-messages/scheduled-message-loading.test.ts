import type { ScheduledSnapshot } from '@moc/notifications'
import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, settle } from '../../../../../helpers/async'
import { createMockReactModule, HookRuntime } from '../../../../broadcast/src/features/test-hook-runtime'

let workspaceId = 'alpha'
const fetchScheduledMessages = vi.fn<(id: string, view?: 'active' | 'history', cursor?: string) => Promise<ScheduledSnapshot>>()
const mutateScheduledMessage = vi.fn<() => Promise<ScheduledSnapshot>>()
const navigate = vi.fn()
const mockHooks = createMockReactModule()
vi.doMock('react', () => ({ ...React, ...mockHooks }))
vi.doMock('../../../../../../apps/console/src/lib/template-editor-html', () => ({
  templateToEditorHtml: (body: string) => body,
  editorHtmlToTemplate: (body: string) => body,
  unsupportedTemplateTags: () => [],
}))
vi.doMock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.doMock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: workspaceId, role: { can_update: true } }) }))
vi.doMock('../../../../../../apps/console/src/features/scheduled-messages/services/scheduled-message-service', () => ({ fetchScheduledMessages, mutateScheduledMessage }))

type ResourceEntry = { data: unknown; error: Error | null; loading: boolean; revision: number }
const resourceEntries = new Map<string, ResourceEntry>()
let intervalHandler: (() => void) | null = null
vi.doMock('../../../../../../apps/console/src/hooks/use-workspace-resource', () => ({
  useWorkspaceResource<T>({ emptyValue, fetcher, resource, workspaceId, enabled = true }: { emptyValue: T; fetcher: (workspaceId: string) => Promise<T>; resource: string; workspaceId: string | null; enabled?: boolean }) {
    const key = `${workspaceId ?? 'none'}:${resource}`
    let entry = resourceEntries.get(key)
    if (!entry) {
      entry = { data: undefined, error: null, loading: false, revision: 0 }
      resourceEntries.set(key, entry)
    }
    const load = mockHooks.useCallback(async (force = false): Promise<void> => {
      if (!workspaceId || !enabled) return
      const current = resourceEntries.get(key)
      if (!current || (current.loading && !force)) return
      const revision = ++current.revision
      current.loading = true
      current.error = null
      try {
        const data = await fetcher(workspaceId)
        if (current.revision === revision) {
          current.data = data
          current.error = null
        }
      } catch (reason) {
        if (current.revision === revision) current.error = reason instanceof Error ? reason : new Error('Load failed')
      } finally {
        if (current.revision === revision) current.loading = false
      }
    }, [enabled, fetcher, key, workspaceId])
    const setData = mockHooks.useCallback((data: T): void => {
      const current = resourceEntries.get(key)
      if (!current) return
      current.revision += 1
      current.data = data
      current.error = null
      current.loading = false
    }, [key])
    const updateData = mockHooks.useCallback((updater: (data: T) => T): void => {
      const current = resourceEntries.get(key)
      if (!current) return
      current.revision += 1
      current.data = updater((current.data as T | undefined) ?? emptyValue)
      current.error = null
      current.loading = false
    }, [emptyValue, key])
    mockHooks.useEffect(() => { if (enabled) void load() }, [enabled, load])
    const current = resourceEntries.get(key)
    return { data: (current?.data as T | undefined) ?? emptyValue, hasData: current?.data !== undefined, error: current?.error ?? null, isLoading: current?.loading ?? false, isInitialLoading: Boolean(workspaceId && enabled && current?.data === undefined && !current?.error), load, setData, updateData }
  },
}))

type HistoryQueryOptions = { queryKey: readonly unknown[]; enabled: boolean; queryFn: (input: { pageParam: string | undefined }) => Promise<ScheduledSnapshot>; getNextPageParam: (page: ScheduledSnapshot) => string | undefined }
type HistoryEntry = { pages: ScheduledSnapshot[]; pageParams: (string | undefined)[]; loaded: boolean; loading: boolean; error: Error | null; options: HistoryQueryOptions }
const historyEntries = new Map<string, HistoryEntry>()
vi.doMock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return { ...actual, useInfiniteQuery(options: HistoryQueryOptions) {
    const key = options.queryKey.join(':')
    let entry = historyEntries.get(key)
    if (!entry) { entry = { pages: [], pageParams: [], loaded: false, loading: false, error: null, options }; historyEntries.set(key, entry) }
    entry.options = options
    const refetch = mockHooks.useCallback(async () => {
      const current = historyEntries.get(key)!
      if (!options.enabled || current.loading) return
      current.loading = true; current.error = null
      try {
        const count = Math.max(1, current.pages.length)
        const pages: ScheduledSnapshot[] = []
        const pageParams: (string | undefined)[] = []
        let pageParam: string | undefined
        for (let index = 0; index < count; index += 1) {
          const page = await current.options.queryFn({ pageParam })
          pages.push(page); pageParams.push(pageParam)
          pageParam = current.options.getNextPageParam(page)
          if (!pageParam) break
        }
        current.pages = pages; current.pageParams = pageParams; current.loaded = true
      } catch (reason) { current.error = reason instanceof Error ? reason : new Error('Load failed') }
      finally { current.loading = false }
    }, [key, options.enabled])
    const fetchNextPage = mockHooks.useCallback(async () => {
      const current = historyEntries.get(key)!
      const last = current.pages.at(-1)
      const pageParam = last && current.options.getNextPageParam(last)
      if (!pageParam || current.loading) return
      current.loading = true; current.error = null
      try {
        const page = await current.options.queryFn({ pageParam })
        current.pages = [...current.pages, page]; current.pageParams = [...current.pageParams, pageParam]
      } catch (reason) { current.error = reason instanceof Error ? reason : new Error('Load failed') }
      finally { current.loading = false }
    }, [key])
    mockHooks.useEffect(() => { if (options.enabled) void refetch() }, [options.enabled, refetch])
    return { data: entry.loaded ? { pages: entry.pages, pageParams: entry.pageParams } : undefined, error: entry.error, isPending: !entry.loaded, isFetching: entry.loading, isFetchingNextPage: entry.loading && entry.loaded, hasNextPage: Boolean(entry.pages.at(-1)?.nextHistoryCursor), refetch, fetchNextPage }
  } }
})

const { useScheduledMessages } = await import('../../../../../../apps/console/src/features/scheduled-messages/use-scheduled-messages')
const { clearCurrentWorkspaceCache, setCurrentWorkspaceIdMirror } = await import('../../../../../../apps/console/src/data/current-workspace')

function snapshot(name: string): ScheduledSnapshot {
  return { templates: [], schedules: [], occurrences: [], memberTypes: [], groups: [], members: [{ id: name, name, memberTypeId: 'member' }] }
}

beforeEach(() => {
  vi.clearAllMocks()
  workspaceId = 'alpha'
  clearCurrentWorkspaceCache()
  resourceEntries.clear()
  historyEntries.clear()
  setCurrentWorkspaceIdMirror(workspaceId)
  intervalHandler = null
  vi.stubGlobal('window', { setInterval: vi.fn((handler: () => void) => { intervalHandler = handler; return 1 }), clearInterval: vi.fn() })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

test('an older reload cannot overwrite a newer scheduled-message snapshot', async () => {
  const pending = deferred<ScheduledSnapshot>()
  fetchScheduledMessages.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(snapshot('newer'))
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await runtime.rerender().actions.reload()
  pending.resolve(snapshot('older'))
  await settle()

  expect(runtime.rerender().state.snapshot.members[0]?.name).toBe('newer')
  runtime.unmount()
})

test('a previous workspace response cannot hide the current workspace snapshot', async () => {
  const pending = deferred<ScheduledSnapshot>()
  fetchScheduledMessages.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(snapshot('beta'))
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  workspaceId = 'beta'
  setCurrentWorkspaceIdMirror(workspaceId)
  runtime.rerender()
  await settle()
  expect(runtime.rerender().state.snapshot.members[0]?.name).toBe('beta')
  pending.resolve(snapshot('alpha'))
  await settle()

  expect(runtime.rerender().state.snapshot.members[0]?.name).toBe('beta')
  expect(runtime.result?.state.isInitialLoading).toBe(false)
  runtime.unmount()
})

test('a reload started before a successful mutation cannot undo its visible result', async () => {
  const pending = deferred<ScheduledSnapshot>()
  fetchScheduledMessages.mockReturnValueOnce(pending.promise)
  mutateScheduledMessage.mockResolvedValueOnce(snapshot('saved'))
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await runtime.rerender().actions.mutate('template.save', {})
  pending.resolve(snapshot('before-save'))
  await settle()

  expect(runtime.rerender().state.snapshot.members[0]?.name).toBe('saved')
  expect(runtime.result?.state.loading).toBe(false)
  runtime.unmount()
})

test('a mutation from the previous workspace cannot overwrite the current view', async () => {
  fetchScheduledMessages.mockResolvedValueOnce(snapshot('alpha')).mockResolvedValueOnce(snapshot('beta'))
  const pending = deferred<ScheduledSnapshot>()
  mutateScheduledMessage.mockReturnValueOnce(pending.promise)
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await settle()
  const mutation = runtime.rerender().actions.mutate('template.save', {})
  workspaceId = 'beta'
  setCurrentWorkspaceIdMirror(workspaceId)
  runtime.rerender()
  await settle()
  pending.resolve(snapshot('old-save'))
  await mutation
  await settle()

  expect(runtime.rerender().state.snapshot.members[0]?.name).toBe('beta')
  expect(runtime.result?.state.busy).toBe(false)
  runtime.unmount()
})

test('the expiry timer filters the displayed snapshot without rewriting cached server data', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_000)
  const expiresAt = new Date(1_500).toISOString()
  const expiringOccurrence = { expires_at: expiresAt } as ScheduledSnapshot['occurrences'][number]
  const initial = { ...snapshot('alpha'), occurrences: [expiringOccurrence] }
  fetchScheduledMessages.mockResolvedValueOnce(initial)
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await settle()
  expect(runtime.rerender().state.snapshot.occurrences).toHaveLength(1)

  vi.spyOn(Date, 'now').mockReturnValue(2_000)
  intervalHandler?.()
  expect(runtime.rerender().state.snapshot.occurrences).toHaveLength(0)
  expect((resourceEntries.get('alpha:scheduled-messages')?.data as ScheduledSnapshot).occurrences).toHaveLength(1)
  runtime.unmount()
})


test('history loads on demand and retains read-only access to cancelled, expired and unknown messages', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(10_000)
  const future = new Date(20_000).toISOString()
  const past = new Date(5_000).toISOString()
  const historySnapshot: ScheduledSnapshot = {
    ...snapshot('alpha'),
    occurrences: [
      { id: 'cancelled', state: 'cancelled', expires_at: future },
      { id: 'expired', state: 'sent', expires_at: past },
      { id: 'unknown', state: 'unknown', expires_at: future },
    ].map(row => ({ ...row, workspace_id: 'alpha', schedule_id: 'schedule', occurrence_on: future, send_on: past, fields: { title: row.id }, body: '{{title}}', message_type: 'announcement', require_arrival: false, revision: 1, synced_revision: 1, telegram_message_id: null, last_sync_error: null })) as ScheduledSnapshot['occurrences'],
  }
  fetchScheduledMessages.mockImplementation(async (_id, view) => view === 'history' ? historySnapshot : snapshot('alpha'))
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await settle()
  expect(fetchScheduledMessages.mock.calls).toEqual([['alpha']])

  runtime.rerender().actions.setTab('history')
  runtime.rerender()
  await settle()
  const history = runtime.rerender()
  expect(fetchScheduledMessages).toHaveBeenLastCalledWith('alpha', 'history', undefined)
  expect(history.meta.occurrences.map(row => row.id)).toEqual(['cancelled', 'expired', 'unknown'])
  expect(history.meta.occurrences.every(row => !row.canManage)).toBe(true)
  for (const id of ['cancelled', 'expired', 'unknown']) {
    history.actions.viewHistory(id)
    expect(runtime.rerender().state.details?.id).toBe(id)
    runtime.rerender().actions.selectOccurrence(id)
    expect(runtime.rerender().state.editing).toBeNull()
  }
  runtime.rerender().actions.changeDetailsOpen(false)
  expect(runtime.rerender().state.details).toBeNull()
  runtime.unmount()
})


test('history loads past the first 100 rows and retains earlier pages when a later load fails and retries', async () => {
  const occurrence = (id: string): ScheduledSnapshot['occurrences'][number] => ({ id, workspace_id: 'alpha', schedule_id: 'schedule', occurrence_on: '2026-01-01', send_on: '2026-01-01T00:00:00Z', expires_at: '2026-01-02T00:00:00Z', fields: { title: id }, body: '{{title}}', message_type: 'announcement', require_arrival: false, state: 'cancelled', revision: 1, synced_revision: 1, telegram_message_id: null, last_sync_error: null })
  const firstPage = { ...snapshot('alpha'), occurrences: Array.from({ length: 100 }, (_, index) => occurrence(`message-${index}`)), nextHistoryCursor: 'older' }
  const lastPage = { ...snapshot('alpha'), occurrences: [occurrence('message-100')], nextHistoryCursor: null }
  let failNextPage = true
  fetchScheduledMessages.mockImplementation(async (_id, view, cursor) => {
    if (view !== 'history') return snapshot('alpha')
    if (!cursor) return firstPage
    if (failNextPage) { failNextPage = false; throw new Error('Offline') }
    return lastPage
  })
  const runtime = new HookRuntime(useScheduledMessages)
  runtime.render({})
  await settle()
  runtime.rerender().actions.setTab('history')
  runtime.rerender()
  await settle()
  expect(runtime.rerender().meta.occurrences).toHaveLength(100)
  runtime.rerender().actions.loadMoreHistory()
  await settle()
  expect(runtime.rerender().state.historyPageError).toBe('Offline')
  expect(runtime.rerender().meta.occurrences).toHaveLength(100)
  expect(runtime.rerender().meta.hasMoreHistory).toBe(true)
  runtime.rerender().actions.loadMoreHistory()
  await settle()
  const result = runtime.rerender()
  expect(fetchScheduledMessages).toHaveBeenLastCalledWith('alpha', 'history', 'older')
  expect(result.meta.occurrences).toHaveLength(101)
  expect(result.meta.hasMoreHistory).toBe(false)
  result.actions.viewHistory('message-100')
  expect(runtime.rerender().state.details?.id).toBe('message-100')
  runtime.unmount()
})
