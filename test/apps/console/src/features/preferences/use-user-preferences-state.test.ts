import * as React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { UserPreferences } from '@moc/sdk/users'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'
import { deferred } from '../../../../../helpers/async'

let preferences: UserPreferences | undefined
let generation = 1
let cachePresent = true
const save = vi.fn()
const toast = vi.fn()
const invalidateQueries = vi.fn()
const setQueryData = vi.fn((_key: readonly unknown[], updater: (current: UserPreferences | undefined) => UserPreferences | undefined) => { preferences = updater(preferences) })
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: preferences, isPending: !preferences, error: null, refetch: vi.fn() }),
  useQueryClient: () => ({ setQueryData, cancelQueries: vi.fn(), invalidateQueries, getQueryState: () => cachePresent ? {} : undefined }),
}))
vi.doMock('../../../../../../apps/console/src/lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.doMock('../../../../../../apps/console/src/data/current-workspace', () => ({ getCurrentWorkspaceGeneration: () => generation }))
vi.doMock('../../../../../../apps/console/src/data/user-preferences', () => ({ fetchUserPreferences: vi.fn(), saveUserPreferences: save }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast }) }))
const { useUserPreferencesState } = await import('../../../../../../apps/console/src/features/preferences/use-user-preferences-state')

beforeEach(() => {
  preferences = { defaultCalendarView: 'week', overviewItemKinds: ['request', 'venue'] }
  generation = 1
  cachePresent = true
  save.mockReset().mockResolvedValue(undefined)
  setQueryData.mockClear()
  invalidateQueries.mockReset()
  toast.mockReset()
})

test('overview changes are a draft until saved and preserve the default calendar view', async () => {
  const runtime = new HookRuntime(useUserPreferencesState)
  runtime.render().actions.changeOverviewItemKinds(['stream', 'equipment'])
  let result = runtime.rerender()
  expect(save).not.toHaveBeenCalled()
  expect(result.state.overviewItemKinds).toEqual(['request', 'venue'])
  await result.actions.saveOverviewItemKinds()
  result = runtime.rerender()
  expect(save).toHaveBeenCalledWith({ overviewItemKinds: ['equipment', 'stream'] })
  expect(preferences).toEqual({ defaultCalendarView: 'week', overviewItemKinds: ['equipment', 'stream'] })
  expect(result.state.hasOverviewChanges).toBe(false)
  runtime.unmount()
})

test('saving the calendar default preserves the stored overview choices', async () => {
  const runtime = new HookRuntime(useUserPreferencesState)
  await runtime.render().actions.changeDefaultCalendarView('day')
  expect(save).toHaveBeenCalledWith({ defaultCalendarView: 'day' })
  expect(preferences?.overviewItemKinds).toEqual(['request', 'venue'])
  runtime.unmount()
})

test('an empty overview preference is saved explicitly and survives a new consumer', async () => {
  const runtime = new HookRuntime(useUserPreferencesState)
  runtime.render().actions.changeOverviewItemKinds([])
  await runtime.rerender().actions.saveOverviewItemKinds()
  runtime.unmount()
  const returning = new HookRuntime(useUserPreferencesState)
  expect(returning.render().state.overviewItemKinds).toEqual([])
  returning.unmount()
})

test('a failed save keeps the draft available for retry', async () => {
  save.mockRejectedValueOnce(new Error('Offline'))
  const runtime = new HookRuntime(useUserPreferencesState)
  runtime.render().actions.changeOverviewItemKinds(['equipment'])
  await runtime.rerender().actions.saveOverviewItemKinds()
  expect(runtime.rerender().state.draftOverviewItemKinds).toEqual(['equipment'])
  expect(preferences?.overviewItemKinds).toEqual(['request', 'venue'])
  runtime.unmount()
})

test('a completed save across a workspace switch refreshes the mounted user preferences', async () => {
  const pending = deferred<void>()
  save.mockReturnValueOnce(pending.promise)
  const runtime = new HookRuntime(useUserPreferencesState)
  runtime.render().actions.changeOverviewItemKinds(['equipment'])
  const saving = runtime.rerender().actions.saveOverviewItemKinds()
  generation += 1
  pending.resolve()
  await saving
  expect(setQueryData).not.toHaveBeenCalled()
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user', 'user', 'preferences'], exact: true })
  runtime.unmount()
})

test('a completed save cannot recreate preferences after sign-out clears the cache', async () => {
  const pending = deferred<void>()
  save.mockReturnValueOnce(pending.promise)
  const runtime = new HookRuntime(useUserPreferencesState)
  runtime.render().actions.changeOverviewItemKinds(['equipment'])
  const saving = runtime.rerender().actions.saveOverviewItemKinds()
  generation += 1
  cachePresent = false
  pending.resolve()
  await saving
  expect(setQueryData).not.toHaveBeenCalled()
  expect(invalidateQueries).not.toHaveBeenCalled()
  runtime.unmount()
})
