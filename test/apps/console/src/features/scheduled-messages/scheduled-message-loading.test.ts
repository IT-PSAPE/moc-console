import type { ScheduledSnapshot } from '@moc/notifications'
import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, settle } from '../../../../../helpers/async'
import { createMockReactModule, HookRuntime } from '../../../../broadcast/src/features/test-hook-runtime'

let workspaceId = 'alpha'
const fetchScheduledMessages = vi.fn<(id: string) => Promise<ScheduledSnapshot>>()
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
vi.doMock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: workspaceId }) }))
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
    return { data: (current?.data as T | undefined) ?? emptyValue, error: current?.error ?? null, isLoading: current?.loading ?? false, isInitialLoading: Boolean(workspaceId && enabled && current?.data === undefined && !current?.error), load, setData, updateData }
  },
}))

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
