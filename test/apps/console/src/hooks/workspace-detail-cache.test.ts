import { QueryObserver } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { renderQueryHook } from '../../../../helpers/query-hook'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'
import { useWorkspaceDetail } from '../../../../../apps/console/src/hooks/use-workspace-detail'
import { clearWorkspaceResources, workspaceResourceKey } from '../../../../../apps/console/src/data/workspace-resource-cache'
import { consoleQueryPolicy } from '../../../../../apps/console/src/lib/console-query-policy'
import { deferred, settle } from '../../../../helpers/async'

afterEach(clearWorkspaceResources)

test('a request already loaded in a collection renders immediately without another read while fresh', () => {
  const request = { id: 'request-a', title: 'Cached request' }
  const fetcher = vi.fn(async () => request)
  queryClient.setQueryData(workspaceResourceKey('workspace-a', 'requests:active'), [request])
  const detail = renderQueryHook(() => useWorkspaceDetail({
    id: request.id, workspaceId: 'workspace-a', resource: 'requests', fetcher,
    collectionResource: 'requests:active',
  }), queryClient)
  expect(detail.data).toEqual(request)
  expect(detail.isLoading).toBe(false)
  const observer = new QueryObserver(queryClient, {
    queryKey: ['workspace', 'workspace-a', 'requests', 'detail', request.id], queryFn: fetcher,
  })
  const stop = observer.subscribe(() => undefined)
  expect(fetcher).not.toHaveBeenCalled()
  stop()
})

test('an entity with the same ID in a different workspace cannot receive seeded data from the first', () => {
  const fetcher = vi.fn(async () => ({ id: 'same-id' }))
  queryClient.setQueryData(workspaceResourceKey('workspace-a', 'requests'), [{ id: 'same-id' }])
  renderQueryHook(() => useWorkspaceDetail({ id: 'same-id', workspaceId: 'workspace-a', resource: 'requests', fetcher }), queryClient)
  const second = renderQueryHook(() => useWorkspaceDetail({ id: 'same-id', workspaceId: 'workspace-b', resource: 'requests', fetcher }), queryClient)
  expect(second.data).toBeNull()
  expect(second.isLoading).toBe(true)
})

test('a newer collection response takes precedence over an older fresh detail entry', () => {
  const key = ['workspace', 'workspace-a', 'requests', 'detail', 'request-a']
  queryClient.setQueryData(key, { id: 'request-a', title: 'Old title' }, { updatedAt: Date.now() - 1_000 })
  const request = { id: 'request-a', title: 'New title' }
  queryClient.setQueryData(workspaceResourceKey('workspace-a', 'requests'), [request])
  const detail = renderQueryHook(() => useWorkspaceDetail({
    id: request.id, workspaceId: 'workspace-a', resource: 'requests', fetcher: async () => request,
  }), queryClient)
  expect(detail.data).toEqual(request)
})

test.each(['bookings', 'venue-bookings', 'streams', 'zoom-meetings'])('opening fresh %s details reuses the collection without another network read', (resource) => {
  const item = { id: 'item', title: 'Already loaded' }
  const updatedAt = Date.now() - 5_000
  queryClient.setQueryData(workspaceResourceKey('workspace', resource), [item], { updatedAt })
  const fetcher = vi.fn(async () => item)
  const detail = renderQueryHook(() => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource, fetcher }), queryClient)
  const queryKey = [...workspaceResourceKey('workspace', resource), 'detail', item.id]
  const observer = new QueryObserver(queryClient, { ...consoleQueryPolicy(resource), queryKey, queryFn: fetcher })
  const stop = observer.subscribe(() => undefined)

  expect(detail.data).toEqual(item)
  expect(detail.isLoading).toBe(false)
  expect(queryClient.getQueryState(queryKey)?.dataUpdatedAt).toBe(updatedAt)
  expect(fetcher).not.toHaveBeenCalled()
  stop()
})

test('stale collection data stays visible while details refresh in the background', async () => {
  const item = { id: 'item', title: 'Cached' }
  const pending = deferred<typeof item>()
  queryClient.setQueryData(workspaceResourceKey('workspace', 'bookings'), [item], { updatedAt: Date.now() - 61_000 })
  const fetcher = vi.fn(() => pending.promise)
  const read = () => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource: 'bookings', fetcher })
  const detail = renderQueryHook(read, queryClient)
  const observer = new QueryObserver(queryClient, { ...consoleQueryPolicy('bookings'), queryKey: ['workspace', 'workspace', 'bookings', 'detail', item.id], queryFn: fetcher })
  const stop = observer.subscribe(() => undefined)
  expect(detail.data).toEqual(item)
  expect(detail.isLoading).toBe(false)
  expect(observer.getCurrentResult().isFetching).toBe(true)
  expect(fetcher).toHaveBeenCalledOnce()
  pending.resolve({ ...item, title: 'Refreshed' })
  await settle()
  expect(renderQueryHook(read, queryClient).data?.title).toBe('Refreshed')
  stop()
})

test('an explicitly invalidated collection cannot seed a fresh detail entry', () => {
  const item = { id: 'item' }
  const collectionKey = workspaceResourceKey('workspace', 'bookings')
  queryClient.setQueryData(collectionKey, [item])
  void queryClient.invalidateQueries({ queryKey: collectionKey, exact: true })
  const fetcher = vi.fn(async () => item)
  renderQueryHook(() => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource: 'bookings', fetcher }), queryClient)
  const observer = new QueryObserver(queryClient, { ...consoleQueryPolicy('bookings'), queryKey: [...collectionKey, 'detail', item.id], queryFn: fetcher })
  const stop = observer.subscribe(() => undefined)
  expect(fetcher).toHaveBeenCalledOnce()
  stop()
})

test('a failed detail refresh keeps cached content and exposes a nonblocking error', async () => {
  const item = { id: 'item' }
  queryClient.setQueryData(workspaceResourceKey('workspace', 'venue-bookings'), [item], { updatedAt: Date.now() - 61_000 })
  const fetcher = vi.fn(async () => { throw new Error('Offline') })
  const read = () => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource: 'venue-bookings', fetcher })
  renderQueryHook(read, queryClient)
  const queryKey = ['workspace', 'workspace', 'venue-bookings', 'detail', item.id]
  const observer = new QueryObserver(queryClient, { ...consoleQueryPolicy('venue-bookings'), queryKey, queryFn: fetcher })
  const stop = observer.subscribe(() => undefined)
  await settle()
  const detail = renderQueryHook(read, queryClient)
  expect(detail.data).toEqual(item)
  expect(detail.error).toBeNull()
  expect(detail.refreshError?.message).toBe('Offline')
  expect(detail.isLoading).toBe(false)
  stop()
})

test('a confirmed deletion is not replaced by an older collection record', () => {
  const item = { id: 'deleted' }
  const collectionKey = workspaceResourceKey('workspace', 'bookings')
  queryClient.setQueryData(collectionKey, [item], { updatedAt: Date.now() - 1_000 })
  queryClient.setQueryData([...collectionKey, 'detail', item.id], null)
  const detail = renderQueryHook(() => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource: 'bookings', fetcher: async () => item }), queryClient)
  expect(detail.data).toBeNull()
  expect(detail.isLoading).toBe(false)
})

test('a collection arriving during a detail read removes the blocking loading state', async () => {
  const pending = deferred<{ id: string; title: string }>()
  const item = { id: 'item', title: 'Loaded by the list' }
  const queryKey = ['workspace', 'workspace', 'bookings', 'detail', item.id]
  const fetcher = () => pending.promise
  const loading = queryClient.fetchQuery({ queryKey, queryFn: fetcher })
  const read = () => useWorkspaceDetail({ id: item.id, workspaceId: 'workspace', resource: 'bookings', fetcher })
  expect(renderQueryHook(read, queryClient).isLoading).toBe(true)
  queryClient.setQueryData(workspaceResourceKey('workspace', 'bookings'), [item])
  const detail = renderQueryHook(read, queryClient)
  expect(detail.data).toEqual(item)
  expect(detail.isLoading).toBe(false)
  expect(detail.error).toBeNull()
  pending.resolve(item)
  await loading
})
