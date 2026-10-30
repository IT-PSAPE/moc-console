import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { DailyQuote, DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'
import { deferred } from '../../../../../helpers/async'

const saveDailyQuote = vi.fn()
const changeDailyQuoteActive = vi.fn()
const setTodayDailyQuote = vi.fn()
const applySelection = vi.fn((next: DailyQuoteSelection | null) => { dailySelection = next })
const toast = vi.fn()
const load = vi.fn()
let workspaceId: string | null = 'workspace-a'
let generation = 1
let canManage = true
let quotes: DailyQuote[] = []
let resourceEnabled = false
let dailySelection: DailyQuoteSelection | null = null
let selectionLoaded = true

vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: workspaceId, role: { can_manage_roles: canManage } }) }))
vi.doMock('../../../../../../apps/console/src/data/current-workspace', () => ({ getCurrentWorkspaceGeneration: () => generation }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast }) }))
vi.doMock('../../../../../../apps/console/src/features/daily-quotes/daily-quote-service', () => ({ fetchDailyQuotes: vi.fn(), fetchDailyQuote: vi.fn(), saveDailyQuote, changeDailyQuoteActive, setTodayDailyQuote }))
vi.doMock('../../../../../../apps/console/src/hooks/use-workspace-resource', () => ({
  useWorkspaceResource: (options: { enabled?: boolean; resource: string }) => {
    resourceEnabled = options.enabled === true
    if (options.resource === 'daily-quote') return { data: dailySelection, hasData: selectionLoaded, error: null, refreshError: null, isInitialLoading: false, load, setData: applySelection }
    return { data: quotes, error: null, refreshError: null, isInitialLoading: false, load, updateData: (updater: (current: DailyQuote[]) => DailyQuote[]) => { quotes = updater(quotes) } }
  },
}))

const { useDailyQuotes } = await import('../../../../../../apps/console/src/features/daily-quotes/use-daily-quotes')

function quote(overrides: Partial<DailyQuote> = {}): DailyQuote {
  return { id: 'quote-1', text: 'A thoughtful quote.', attribution: 'An author', active: true, createdAt: '2026-10-29T10:00:00Z', updatedAt: '2026-10-29T10:00:00Z', ...overrides }
}

function textChange(value: string): React.ChangeEvent<HTMLTextAreaElement> {
  return { currentTarget: { value } } as React.ChangeEvent<HTMLTextAreaElement>
}

function inputChange(value: string): React.ChangeEvent<HTMLInputElement> {
  return { currentTarget: { value } } as React.ChangeEvent<HTMLInputElement>
}

beforeEach(() => {
  workspaceId = 'workspace-a'
  generation = 1
  canManage = true
  quotes = [quote()]
  resourceEnabled = false
  selectionLoaded = true
  dailySelection = { quote: quote({ id: 'rotation-quote' }), date: '2026-10-29', timezone: 'Africa/Harare', overridden: false }
  saveDailyQuote.mockReset().mockResolvedValue(quote({ id: 'created', text: 'New quote', attribution: null }))
  changeDailyQuoteActive.mockReset().mockResolvedValue(quote({ active: false }))
  setTodayDailyQuote.mockReset().mockResolvedValue({ ...dailySelection, quote: quote(), overridden: true })
  applySelection.mockClear()
  toast.mockReset()
  load.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.restoreAllMocks())

test('only admins can load or manage daily quotes', async () => {
  canManage = false
  const runtime = new HookRuntime(useDailyQuotes)
  const result = runtime.render()
  expect(resourceEnabled).toBe(false)
  result.actions.openCreate()
  result.actions.editQuoteFor(quote())()
  await result.actions.changeActiveFor(quote())(false)
  await result.actions.selectTodayFor(quote())()
  await result.actions.retry()
  expect(runtime.rerender().state.editorOpen).toBe(false)
  expect(saveDailyQuote).not.toHaveBeenCalled()
  expect(changeDailyQuoteActive).not.toHaveBeenCalled()
  expect(setTodayDailyQuote).not.toHaveBeenCalled()
  expect(load).not.toHaveBeenCalled()
  runtime.unmount()
})

test('adds a trimmed quote and updates the collection without losing existing quotes', async () => {
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.openCreate()
  runtime.rerender().actions.changeText(textChange('  New quote  '))
  await runtime.rerender().actions.save()
  expect(saveDailyQuote).toHaveBeenCalledWith({ text: 'New quote', attribution: null, active: true }, 'workspace-a')
  const result = runtime.rerender()
  expect(result.state.editorOpen).toBe(false)
  expect(result.state.visibleQuotes.map(item => item.id)).toEqual(['created', 'quote-1'])
  expect(toast).toHaveBeenCalledWith({ title: 'Quote added', variant: 'success' })
  runtime.unmount()
})

test('editing an inactive quote preserves its status and trims its attribution', async () => {
  quotes = [quote({ active: false })]
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.editQuoteFor(quotes[0])()
  runtime.rerender().actions.changeAttribution(inputChange('  Revised source  '))
  await runtime.rerender().actions.save()
  expect(saveDailyQuote).toHaveBeenCalledWith({ id: 'quote-1', text: 'A thoughtful quote.', attribution: 'Revised source', active: false }, 'workspace-a')
  runtime.unmount()
})

test('rejects empty or oversized quote drafts before making a request', async () => {
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.openCreate()
  await runtime.rerender().actions.save()
  runtime.rerender().actions.changeText(textChange('a'.repeat(1001)))
  await runtime.rerender().actions.save()
  runtime.rerender().actions.changeText(textChange('Valid quote'))
  runtime.rerender().actions.changeAttribution(inputChange('a'.repeat(201)))
  await runtime.rerender().actions.save()
  expect(saveDailyQuote).not.toHaveBeenCalled()
  runtime.unmount()
})

test('failed saves preserve the editor draft and existing cached quotes', async () => {
  saveDailyQuote.mockRejectedValue(new Error('Offline'))
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.openCreate()
  runtime.rerender().actions.changeText(textChange('Keep my draft'))
  await runtime.rerender().actions.save()
  const result = runtime.rerender()
  expect(result.state.editorOpen).toBe(true)
  expect(result.state.text).toBe('Keep my draft')
  expect(result.state.visibleQuotes).toEqual([quote()])
  expect(toast).toHaveBeenCalledWith({ title: 'Could not save quote', description: 'Offline', variant: 'error' })
  runtime.unmount()
})

test('search finds attribution as well as quote text', () => {
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.changeSearch(inputChange('  AUTHOR  '))
  expect(runtime.rerender().state.visibleQuotes).toHaveLength(1)
  runtime.rerender().actions.changeSearch(inputChange('missing'))
  expect(runtime.rerender().state.visibleQuotes).toHaveLength(0)
  runtime.unmount()
})

test('deactivation updates the cached quote and can be reversed', async () => {
  const runtime = new HookRuntime(useDailyQuotes)
  await runtime.render().actions.changeActiveFor(quotes[0])(false)
  expect(runtime.rerender().state.visibleQuotes[0].active).toBe(false)
  changeDailyQuoteActive.mockResolvedValue(quote())
  await runtime.rerender().actions.changeActiveFor(quotes[0])(true)
  expect(runtime.rerender().state.visibleQuotes[0].active).toBe(true)
  expect(changeDailyQuoteActive.mock.calls).toEqual([['quote-1', false, 'workspace-a'], ['quote-1', true, 'workspace-a']])
  runtime.unmount()
})

test('a pending save from an old workspace cannot update the new workspace', async () => {
  const pending = deferred<DailyQuote>()
  saveDailyQuote.mockReturnValue(pending.promise)
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.openCreate()
  runtime.rerender().actions.changeText(textChange('Old workspace draft'))
  const saving = runtime.rerender().actions.save()
  workspaceId = 'workspace-b'
  generation += 1
  quotes = [quote({ id: 'new-workspace-quote' })]
  const nextWorkspace = runtime.rerender()
  expect(nextWorkspace.state.editorOpen).toBe(false)
  expect(nextWorkspace.state.text).toBe('')
  expect(nextWorkspace.state.isSaving).toBe(false)
  pending.resolve(quote({ id: 'old-workspace-result' }))
  await saving
  expect(runtime.rerender().state.visibleQuotes.map(item => item.id)).toEqual(['new-workspace-quote'])
  expect(toast).not.toHaveBeenCalled()
  runtime.unmount()
})

test('rapid duplicate saves share the pending action guard', async () => {
  const pending = deferred<DailyQuote>()
  saveDailyQuote.mockReturnValue(pending.promise)
  const runtime = new HookRuntime(useDailyQuotes)
  runtime.render().actions.openCreate()
  runtime.rerender().actions.changeText(textChange('New quote'))
  const result = runtime.rerender()
  const first = result.actions.save()
  const second = result.actions.save()
  expect(saveDailyQuote).toHaveBeenCalledOnce()
  pending.resolve(quote({ id: 'created' }))
  await Promise.all([first, second])
  runtime.unmount()
})

test('selecting an active quote for today updates the shared banner selection immediately', async () => {
  const selected = { quote: quote(), date: '2026-10-29', timezone: 'Africa/Harare', overridden: true }
  setTodayDailyQuote.mockResolvedValue(selected)
  const runtime = new HookRuntime(useDailyQuotes)
  await runtime.render().actions.selectTodayFor(quote())()
  expect(setTodayDailyQuote).toHaveBeenCalledWith('quote-1', 'workspace-a')
  expect(applySelection).toHaveBeenCalledWith(selected)
  expect(runtime.rerender().state.todayQuoteId).toBe('quote-1')
  expect(runtime.rerender().state.isOverridden).toBe(true)
  runtime.unmount()
})

test('restoring automatic rotation clears the override and applies the returned selection', async () => {
  dailySelection = { quote: quote(), date: '2026-10-29', timezone: 'Africa/Harare', overridden: true }
  const automatic = { ...dailySelection, quote: quote({ id: 'automatic' }), overridden: false }
  setTodayDailyQuote.mockResolvedValue(automatic)
  const runtime = new HookRuntime(useDailyQuotes)
  await runtime.render().actions.restoreAutomaticRotation()
  expect(setTodayDailyQuote).toHaveBeenCalledWith(null, 'workspace-a')
  expect(applySelection).toHaveBeenCalledWith(automatic)
  expect(runtime.rerender().state.isOverridden).toBe(false)
  expect(runtime.rerender().state.todayQuoteId).toBe('automatic')
  runtime.unmount()
})

test('inactive quotes and the already selected quote cannot be chosen for today', async () => {
  const runtime = new HookRuntime(useDailyQuotes)
  let result = runtime.render()
  await result.actions.selectTodayFor(quote({ active: false }))()
  dailySelection = { quote: quote(), date: '2026-10-29', timezone: 'Africa/Harare', overridden: false }
  result = runtime.rerender()
  expect(result.meta.canUseToday(quote())).toBe(false)
  await result.actions.selectTodayFor(quote())()
  expect(setTodayDailyQuote).not.toHaveBeenCalled()
  runtime.unmount()
})

test('override controls wait for the current selection to load', async () => {
  selectionLoaded = false
  dailySelection = null
  const runtime = new HookRuntime(useDailyQuotes)
  const result = runtime.render()
  expect(result.meta.canUseToday(quote())).toBe(false)
  await result.actions.selectTodayFor(quote())()
  expect(setTodayDailyQuote).not.toHaveBeenCalled()
  runtime.unmount()
})

test('an override response from the previous workspace cannot replace its successor banner', async () => {
  const pending = deferred<DailyQuoteSelection>()
  setTodayDailyQuote.mockReturnValue(pending.promise)
  const runtime = new HookRuntime(useDailyQuotes)
  const saving = runtime.render().actions.selectTodayFor(quote())()
  workspaceId = 'workspace-b'
  generation += 1
  const newSelection = { quote: quote({ id: 'new-workspace' }), date: '2026-10-29', timezone: 'Africa/Harare', overridden: false }
  dailySelection = newSelection
  runtime.rerender()
  pending.resolve({ ...newSelection, quote: quote({ id: 'old-workspace' }), overridden: true })
  await saving
  expect(applySelection).not.toHaveBeenCalled()
  expect(runtime.rerender().state.todayQuoteId).toBe('new-workspace')
  expect(toast).not.toHaveBeenCalled()
  runtime.unmount()
})
