import { QueryObserver, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { createQueryClient } from '@moc/query'
import { setCurrentWorkspaceIdMirror } from '../../../../../apps/console/src/data/current-workspace'
import { useWorkspaceRefreshRecovery } from '../../../../../apps/console/src/hooks/use-workspace-refresh-recovery'
import { renderQueryHook } from '../../../../helpers/query-hook'
import { deferred, settle } from '../../../../helpers/async'

const cleanup: (() => void)[] = []
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop()
  setCurrentWorkspaceIdMirror(null)
})

function createClient(): QueryClient {
  const client = createQueryClient()
  cleanup.push(() => client.clear())
  return client
}

async function failedQuery(client: QueryClient, queryKey: QueryKey, options: { cached?: boolean; active?: boolean; enabled?: boolean } = {}) {
  const { cached = true, active = true, enabled = true } = options
  const fetcher = vi.fn<() => Promise<string[]>>().mockRejectedValue(new Error('Offline'))
  if (cached) client.setQueryData(queryKey, ['Last loaded value'])
  const observer = new QueryObserver(client, { queryKey, queryFn: fetcher, enabled, staleTime: Infinity, retry: false })
  const stop = observer.subscribe(() => undefined)
  cleanup.push(stop)
  await client.fetchQuery({ queryKey, queryFn: fetcher, staleTime: 0, retry: false }).catch(() => undefined)
  if (!active) stop()
  return { fetcher, stop }
}

test('cached background failures are nonblocking and a successful retry clears recovery state', async () => {
  const client = createClient()
  const key = ['workspace', 'workspace-a', 'requests:active']
  const { fetcher } = await failedQuery(client, key)
  const read = () => useWorkspaceRefreshRecovery('workspace-a')
  const failed = renderQueryHook(read, client)
  expect(failed.state).toEqual({ hasRefreshError: true, isRetrying: false })
  expect(client.getQueryData(key)).toEqual(['Last loaded value'])
  fetcher.mockResolvedValue(['Updated value'])
  await failed.actions.retry()
  expect(renderQueryHook(read, client).state).toEqual({ hasRefreshError: false, isRetrying: false })
  expect(client.getQueryData(key)).toEqual(['Updated value'])
})

test('initial failures, inactive queries, disabled queries and other scopes do not create a notice', async () => {
  const client = createClient()
  await failedQuery(client, ['workspace', 'workspace-a', 'uncached'], { cached: false })
  await failedQuery(client, ['workspace', 'workspace-a', 'inactive'], { active: false })
  await failedQuery(client, ['workspace', 'workspace-a', 'disabled'], { enabled: false })
  await failedQuery(client, ['workspace', 'workspace-b', 'requests'])
  await failedQuery(client, ['user', 'user-a', 'preferences'])
  expect(renderQueryHook(() => useWorkspaceRefreshRecovery('workspace-a'), client).state.hasRefreshError).toBe(false)
  expect(renderQueryHook(() => useWorkspaceRefreshRecovery(null), client).state.hasRefreshError).toBe(false)
})

test('retry touches only failed active queries in the selected workspace', async () => {
  const client = createClient()
  const selected = await failedQuery(client, ['workspace', 'workspace-a', 'bookings'])
  const other = await failedQuery(client, ['workspace', 'workspace-b', 'bookings'])
  const inactive = await failedQuery(client, ['workspace', 'workspace-a', 'inactive'], { active: false })
  const initial = await failedQuery(client, ['workspace', 'workspace-a', 'initial'], { cached: false })
  const healthy = await failedQuery(client, ['workspace', 'workspace-a', 'healthy'])
  client.setQueryData(['workspace', 'workspace-a', 'healthy'], ['Healthy data'])
  const counts = [other, inactive, initial, healthy].map(query => query.fetcher.mock.calls.length)
  const pending = deferred<string[]>()
  selected.fetcher.mockReturnValue(pending.promise)
  const read = () => useWorkspaceRefreshRecovery('workspace-a')
  const retrying = renderQueryHook(read, client).actions.retry()
  await settle()
  expect(renderQueryHook(read, client).state).toEqual({ hasRefreshError: true, isRetrying: true })
  expect([other, inactive, initial, healthy].map(query => query.fetcher.mock.calls.length)).toEqual(counts)
  pending.resolve(['Refreshed'])
  await retrying
  expect(renderQueryHook(read, client).state.hasRefreshError).toBe(false)
})

test('changing workspace removes the old notice and prevents a stale retry action', async () => {
  const client = createClient()
  setCurrentWorkspaceIdMirror('workspace-a')
  const { fetcher } = await failedQuery(client, ['workspace', 'workspace-a', 'equipment'])
  const previous = renderQueryHook(() => useWorkspaceRefreshRecovery('workspace-a'), client)
  const calls = fetcher.mock.calls.length
  setCurrentWorkspaceIdMirror('workspace-b')
  expect(renderQueryHook(() => useWorkspaceRefreshRecovery('workspace-b'), client).state.hasRefreshError).toBe(false)
  await previous.actions.retry()
  expect(fetcher).toHaveBeenCalledTimes(calls)
})

test('an unsuccessful retry keeps last loaded data and remains recoverable', async () => {
  const client = createClient()
  const key = ['workspace', 'workspace-a', 'venue-bookings', 'detail', 'booking-a']
  const { stop } = await failedQuery(client, key)
  const read = () => useWorkspaceRefreshRecovery('workspace-a')
  await renderQueryHook(read, client).actions.retry()
  expect(renderQueryHook(read, client).state).toEqual({ hasRefreshError: true, isRetrying: false })
  expect(client.getQueryData(key)).toEqual(['Last loaded value'])
  stop()
  expect(renderQueryHook(read, client).state.hasRefreshError).toBe(false)
})
