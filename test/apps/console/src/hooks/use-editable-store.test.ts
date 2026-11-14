import * as React from 'react'
import { expect, test, vi } from 'vitest'
import { HookRuntime, createMockReactModule } from '../../../broadcast/src/features/test-hook-runtime'
import { deferred, settle } from '../../../../helpers/async'

const mockReact = createMockReactModule()
vi.doMock('react', () => ({
  ...React,
  ...mockReact,
  useReducer<State, Action>(reducer: (state: State, action: Action) => State, initialState: State) {
    const [state, setState] = mockReact.useState(initialState)
    const dispatch = mockReact.useCallback((action: Action) => setState(current => reducer(current, action)), [reducer])
    return [state, dispatch] as const
  },
}))

const { useEditableStore } = await import('../../../../../apps/console/src/hooks/use-editable-store')

type RecordValue = { id: string; location: string; status: string; updatedAt: string }
const original: RecordValue = { id: 'equipment-a', location: 'Store', status: 'available', updatedAt: 'old' }

function createStore(persist: (value: RecordValue) => Promise<RecordValue>) {
  let initialValue = original
  const sync = vi.fn((value: RecordValue) => { initialValue = value })
  const runtime = new HookRuntime(() => useEditableStore(initialValue, { persist, sync, errorMessage: 'Save failed' }))
  return { runtime, sync, replace: (value: RecordValue) => { initialValue = value } }
}

test('a successful save keeps edits made while pending and applies server fields', async () => {
  const pending = deferred<RecordValue>()
  const persist = vi.fn().mockReturnValue(pending.promise)
  const { runtime } = createStore(persist)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  expect(runtime.rerender().state.isSaving).toBe(true)
  runtime.rerender().actions.updateField('location', 'Edited while saving')
  runtime.rerender().actions.updateField('status', 'maintenance')
  runtime.rerender()

  const persisted = { ...original, location: 'Submitted', updatedAt: 'server time' }
  pending.resolve(persisted)
  await saving

  const result = runtime.rerender()
  expect(result.state.original).toEqual(persisted)
  expect(result.state.draft).toEqual({ ...persisted, location: 'Edited while saving', status: 'maintenance' })
  expect(result.state.isDirty).toBe(true)
  expect(result.state.isSaving).toBe(false)
  runtime.unmount()
})

test('unchanged submitted fields receive normalized server values and clear dirty state', async () => {
  const persisted = { ...original, location: 'Server normalized' }
  const { runtime, replace } = createStore(async () => persisted)
  runtime.render().actions.updateField('location', 'Submitted')
  await runtime.rerender().actions.save()
  expect(runtime.rerender().state.draft).toEqual(persisted)
  expect(runtime.rerender().state.isDirty).toBe(false)
  const refreshed = { ...persisted, location: 'Refreshed after saving' }
  replace(refreshed)
  runtime.rerender()
  expect(runtime.rerender().state.draft).toEqual(refreshed)
  expect(runtime.rerender().state.isDirty).toBe(false)
  runtime.unmount()
})

test('reverting to the original value during a save cannot reconcile from optimistic props', async () => {
  const pending = deferred<RecordValue>()
  const { runtime } = createStore(() => pending.promise)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  runtime.rerender().actions.updateField('location', original.location)
  runtime.rerender()
  expect(runtime.rerender().state.draft).toEqual(original)
  expect(runtime.rerender().state.isSaving).toBe(true)

  const persisted = { ...original, location: 'Submitted', updatedAt: 'server time' }
  pending.resolve(persisted)
  await saving
  const result = runtime.rerender()
  expect(result.state.original).toEqual(persisted)
  expect(result.state.draft).toEqual({ ...original, updatedAt: 'server time' })
  expect(result.state.isDirty).toBe(true)
  expect(result.state.isSaving).toBe(false)
  runtime.unmount()
})

test('discarding during a save preserves the local reversion until its request completes', async () => {
  const pending = deferred<RecordValue>()
  const { runtime } = createStore(() => pending.promise)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  runtime.rerender().actions.updateField('status', 'maintenance')
  runtime.rerender().actions.discard()
  runtime.rerender()
  expect(runtime.rerender().state.draft).toEqual(original)
  expect(runtime.rerender().state.isSaving).toBe(true)

  const persisted = { ...original, location: 'Submitted' }
  pending.resolve(persisted)
  await saving
  const result = runtime.rerender()
  expect(result.state.original).toEqual(persisted)
  expect(result.state.draft).toEqual(original)
  expect(result.state.isDirty).toBe(true)
  expect(result.state.isSaving).toBe(false)
  runtime.unmount()
})

test('failed saves roll back optimistic cache changes while preserving a retryable draft', async () => {
  const pending = deferred<void>()
  const persist = vi.fn(async () => { await pending.promise; throw new Error('Offline') })
  const { runtime, sync } = createStore(persist)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  runtime.rerender().actions.updateField('status', 'maintenance')
  runtime.rerender()
  pending.resolve()
  await expect(saving).rejects.toThrow('Offline')
  expect(sync).toHaveBeenLastCalledWith(original)
  const result = runtime.rerender()
  expect(result.state.draft).toEqual({ ...original, location: 'Submitted', status: 'maintenance' })
  expect(result.state.isDirty).toBe(true)
  expect(result.state.error).toBe('Offline')
  expect(result.state.isSaving).toBe(false)
  runtime.unmount()
})

test('rapid duplicate saves share one request and release the guard after completion', async () => {
  const pending = deferred<RecordValue>()
  const persist = vi.fn().mockReturnValue(pending.promise)
  const { runtime } = createStore(persist)
  runtime.render().actions.updateField('location', 'Submitted')
  const actions = runtime.rerender().actions
  const first = actions.save()
  const duplicate = actions.save()
  expect(duplicate).toBe(first)
  await settle()
  expect(persist).toHaveBeenCalledOnce()
  pending.resolve({ ...original, location: 'Submitted' })
  await first
  runtime.rerender().actions.updateField('location', 'Second save')
  await runtime.rerender().actions.save()
  expect(persist).toHaveBeenCalledTimes(2)
  runtime.unmount()
})

test('completion from a previously selected record cannot overwrite its successor', async () => {
  const pending = deferred<RecordValue>()
  const { runtime, replace } = createStore(() => pending.promise)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  const nextRecord = { ...original, id: 'equipment-b', location: 'Other store' }
  replace(nextRecord)
  runtime.rerender()
  expect(runtime.rerender().state.draft).toEqual(nextRecord)
  pending.resolve({ ...original, location: 'Saved old record' })
  await saving
  // A real provider updates only the matching collection item on sync.
  replace(nextRecord)
  expect(runtime.rerender().state.draft).toEqual(nextRecord)
  runtime.unmount()
})

test('resetting the same record invalidates a pending completion', async () => {
  const pending = deferred<RecordValue>()
  const { runtime, replace } = createStore(() => pending.promise)
  runtime.render().actions.updateField('location', 'Submitted')
  const saving = runtime.rerender().actions.save()
  await settle()
  const replacement = { ...original, location: 'Reset value' }
  replace(replacement)
  runtime.rerender().actions.reset(replacement)
  runtime.rerender().actions.updateField('status', 'maintenance')
  runtime.rerender()
  pending.resolve({ ...original, location: 'Old completion' })
  await saving
  expect(runtime.rerender().state.draft).toEqual({ ...replacement, status: 'maintenance' })
  runtime.unmount()
})
