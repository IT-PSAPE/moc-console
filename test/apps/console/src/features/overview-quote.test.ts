import * as React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { HookRuntime, createMockReactModule } from '../../../broadcast/src/features/test-hook-runtime'

let selection: DailyQuoteSelection | null = null
const load = vi.fn()
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('../../../../../apps/console/src/hooks/use-workspace-resource', () => ({ useWorkspaceResource: () => ({ data: selection, error: null, isInitialLoading: false, load }) }))
const { useOverviewQuote } = await import('../../../../../apps/console/src/features/overview/use-overview-quote')
function useQuote(now: Date) { return useOverviewQuote('workspace', now) }

beforeEach(() => { selection = { quote: null, date: '2026-10-29', timezone: 'Pacific/Auckland', overridden: false }; load.mockReset().mockResolvedValue(undefined) })

test('an empty quote library refreshes when the workspace date rolls over', () => {
  const runtime = new HookRuntime(useQuote)
  runtime.render(new Date('2026-10-29T10:55:00Z'))
  expect(load).not.toHaveBeenCalled()
  runtime.render(new Date('2026-10-29T11:01:00Z'))
  expect(load).toHaveBeenCalledWith(true)
  runtime.unmount()
})

test('minute ticks do not refetch quotes while their workspace date is unchanged', () => {
  const runtime = new HookRuntime(useQuote)
  runtime.render(new Date('2026-10-29T00:00:00Z'))
  runtime.render(new Date('2026-10-29T00:01:00Z'))
  runtime.render(new Date('2026-10-29T00:02:00Z'))
  expect(load).not.toHaveBeenCalled()
  runtime.unmount()
})
