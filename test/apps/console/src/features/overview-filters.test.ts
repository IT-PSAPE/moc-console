import { expect, test } from 'vitest'
import type { OverviewItemKind } from '@moc/sdk/users'
import { getOverviewFilterKinds, updateOverviewFilterQuery } from '../../../../../apps/console/src/features/overview/overview-filter-query'

const all: OverviewItemKind[] = ['request', 'equipment', 'venue', 'stream', 'message']
const saved: OverviewItemKind[] = ['request', 'equipment']
const scope = 'user:workspace'

test('a fresh overview uses the saved cross-device defaults', () => {
  expect(getOverviewFilterKinds(new URLSearchParams(), scope, saved, all)).toEqual({ kinds: saved, overridden: false })
})

test('temporary filters override saved defaults and preserve unrelated query state', () => {
  const params = updateOverviewFilterQuery(new URLSearchParams('other=keep'), scope, ['stream'])
  expect(getOverviewFilterKinds(params, scope, saved, all)).toEqual({ kinds: ['stream'], overridden: true })
  expect(params.get('other')).toBe('keep')
  expect(saved).toEqual(['request', 'equipment'])
})

test('an explicit empty selection shows no items rather than reverting to all', () => {
  const params = updateOverviewFilterQuery(new URLSearchParams(), scope, [])
  expect(getOverviewFilterKinds(params, scope, saved, all)).toEqual({ kinds: [], overridden: true })
})

test('reset restores the current saved defaults', () => {
  const params = updateOverviewFilterQuery(new URLSearchParams(), scope, ['stream'])
  const reset = updateOverviewFilterQuery(params, scope, null)
  expect(getOverviewFilterKinds(reset, scope, ['venue'], all)).toEqual({ kinds: ['venue'], overridden: false })
  expect(reset.has('show')).toBe(false)
})

test('another user or workspace cannot inherit the previous temporary override', () => {
  const params = updateOverviewFilterQuery(new URLSearchParams(), scope, ['stream'])
  expect(getOverviewFilterKinds(params, 'other:workspace', saved, all)).toEqual({ kinds: saved, overridden: false })
  expect(getOverviewFilterKinds(params, 'user:other', saved, all)).toEqual({ kinds: saved, overridden: false })
})

test('invalid kinds fall back to defaults and restricted kinds stay hidden', () => {
  expect(getOverviewFilterKinds(new URLSearchParams('overviewScope=user:workspace&show=invalid'), scope, saved, all).kinds).toEqual(saved)
  const params = updateOverviewFilterQuery(new URLSearchParams(), scope, ['message'])
  expect(getOverviewFilterKinds(params, scope, saved, ['request'])).toEqual({ kinds: [], overridden: true })
})
