import { expect, test, vi } from 'vitest'
import { createDailyQuotesClient } from '../../../packages/sdk/src/daily-quotes'
import { createOverviewClient } from '../../../packages/sdk/src/overview'
import { createUsersClient } from '../../../packages/sdk/src/users'
import type { MocTransport } from '../../../packages/sdk/src/transport'

test('quote and agenda SDK calls keep workspace selection separate from caller-controlled input', async () => {
  const call = vi.fn().mockResolvedValue(null)
  const transport = { call } as unknown as MocTransport
  const quotes = createDailyQuotesClient(transport)
  await quotes.list('workspace')
  await quotes.getDaily('workspace')
  await quotes.setToday('quote', 'workspace')
  await quotes.setToday(null, 'workspace')
  await quotes.save({ text: 'Keep going.', attribution: 'Ada' }, 'workspace')
  await quotes.setActive('quote', false, 'workspace')
  await createOverviewClient(transport).scheduledMessages('workspace')
  await createUsersClient(transport).updatePreferences({ overviewItemKinds: ['request'] })
  expect(call.mock.calls).toEqual([
    ['dailyQuotes', 'list', undefined, 'workspace'],
    ['dailyQuotes', 'getDaily', undefined, 'workspace'],
    ['dailyQuotes', 'setToday', { id: 'quote' }, 'workspace'],
    ['dailyQuotes', 'setToday', { id: null }, 'workspace'],
    ['dailyQuotes', 'save', { text: 'Keep going.', attribution: 'Ada' }, 'workspace'],
    ['dailyQuotes', 'setActive', { id: 'quote', active: false }, 'workspace'],
    ['overview', 'scheduledMessages', undefined, 'workspace'],
    ['users', 'updatePreferences', { overviewItemKinds: ['request'] }],
  ])
})
