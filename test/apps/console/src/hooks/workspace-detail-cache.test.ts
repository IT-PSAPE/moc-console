import { QueryObserver } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { renderQueryHook } from '../../../../helpers/query-hook'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'
import { useWorkspaceDetail } from '../../../../../apps/console/src/hooks/use-workspace-detail'
import { clearWorkspaceResources } from '../../../../../apps/console/src/data/workspace-resource-cache'

afterEach(clearWorkspaceResources)

test('a request already loaded in a collection renders immediately without another read while fresh', () => {
  const request = { id: 'request-a', title: 'Cached request' }
  const fetcher = vi.fn(async () => request)
  const detail = renderQueryHook(() => useWorkspaceDetail({
    id: request.id, workspaceId: 'workspace-a', resource: 'requests', fetcher,
    initialData: request, initialDataUpdatedAt: Date.now(),
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
  renderQueryHook(() => useWorkspaceDetail({ id: 'same-id', workspaceId: 'workspace-a', resource: 'requests', fetcher, initialData: { id: 'same-id' } }), queryClient)
  const second = renderQueryHook(() => useWorkspaceDetail({ id: 'same-id', workspaceId: 'workspace-b', resource: 'requests', fetcher }), queryClient)
  expect(second.data).toBeNull()
  expect(second.isLoading).toBe(true)
})

test('a newer collection response takes precedence over an older fresh detail entry', () => {
  const key = ['workspace', 'workspace-a', 'requests', 'detail', 'request-a']
  queryClient.setQueryData(key, { id: 'request-a', title: 'Old title' }, { updatedAt: Date.now() - 1_000 })
  const request = { id: 'request-a', title: 'New title' }
  const detail = renderQueryHook(() => useWorkspaceDetail({
    id: request.id, workspaceId: 'workspace-a', resource: 'requests', fetcher: async () => request,
    initialData: request, initialDataUpdatedAt: Date.now(),
  }), queryClient)
  expect(detail.data).toEqual(request)
})
