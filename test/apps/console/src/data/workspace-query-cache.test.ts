import { QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred, settle } from '../../../../helpers/async'
import { clearWorkspaceResources, getWorkspaceResourceState, invalidateWorkspaceResource, loadWorkspaceResource, setWorkspaceResourceData, workspaceResourceKey } from '../../../../../apps/console/src/data/workspace-resource-cache'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'

afterEach(() => clearWorkspaceResources())

describe('TanStack workspace cache', () => {
  test('shares an in-flight request and reuses fresh data across consumers', async () => {
    const pending = deferred<string[]>()
    const fetcher = vi.fn(() => pending.promise)
    const first = loadWorkspaceResource('workspace-a', 'members', fetcher)
    const second = loadWorkspaceResource('workspace-a', 'members', fetcher)
    pending.resolve(['Alice'])
    expect(await first).toEqual(['Alice'])
    expect(await second).toEqual(['Alice'])
    expect(await loadWorkspaceResource('workspace-a', 'members', fetcher)).toEqual(['Alice'])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  test('never shares cached data between workspace keys', async () => {
    await loadWorkspaceResource('workspace-a', 'members', async () => ['Alice'])
    expect(getWorkspaceResourceState('workspace-b', 'members').data).toBeUndefined()
    await loadWorkspaceResource('workspace-b', 'members', async () => ['Bob'])
    expect(getWorkspaceResourceState('workspace-a', 'members').data).toEqual(['Alice'])
    expect(getWorkspaceResourceState('workspace-b', 'members').data).toEqual(['Bob'])
  })

  test('notifies every observer when a mutation replaces cached data', () => {
    const queryKey = workspaceResourceKey('workspace-a', 'members')
    const first = new QueryObserver<string[]>(queryClient, { queryKey, enabled: false })
    const second = new QueryObserver<string[]>(queryClient, { queryKey, enabled: false })
    const stopFirst = first.subscribe(() => undefined)
    const stopSecond = second.subscribe(() => undefined)
    setWorkspaceResourceData('workspace-a', 'members', ['Saved'])
    expect(first.getCurrentResult().data).toEqual(['Saved'])
    expect(second.getCurrentResult().data).toEqual(['Saved'])
    stopFirst(); stopSecond()
  })

  test('refetches active data after invalidation', async () => {
    const queryKey = workspaceResourceKey('workspace-a', 'members')
    setWorkspaceResourceData('workspace-a', 'members', ['Old'])
    const fetcher = vi.fn(async () => ['New'])
    const observer = new QueryObserver(queryClient, { queryKey, queryFn: fetcher })
    const stop = observer.subscribe(() => undefined)
    invalidateWorkspaceResource('workspace-a', 'members')
    await settle()
    expect(observer.getCurrentResult().data).toEqual(['New'])
    expect(fetcher).toHaveBeenCalledTimes(1)
    stop()
  })

  test('invalidating a pending resource prevents its old response restoring stale data', async () => {
    const pending = deferred<string[]>()
    const request = loadWorkspaceResource('workspace-a', 'members', () => pending.promise)
    const cancelled = request.catch(() => undefined)
    invalidateWorkspaceResource('workspace-a', 'members')
    pending.resolve(['Old'])
    await cancelled
    expect(getWorkspaceResourceState('workspace-a', 'members').data).toBeUndefined()
  })

  test('a collection mutation cancels a pending detail read before refreshing it', async () => {
    const pending = deferred<string>()
    const queryKey = [...workspaceResourceKey('workspace-a', 'members'), 'detail', 'alice']
    const fetcher = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue('Updated Alice')
    const observer = new QueryObserver<string>(queryClient, { queryKey, queryFn: fetcher })
    const stop = observer.subscribe(() => undefined)
    setWorkspaceResourceData('workspace-a', 'members', ['Updated Alice'])
    pending.resolve('Old Alice')
    await settle()
    expect(observer.getCurrentResult().data).toBe('Updated Alice')
    expect(fetcher).toHaveBeenCalledTimes(2)
    stop()
  })

  test('booking mutations invalidate related calendars and per-equipment reads only in the same workspace', () => {
    const calendar = workspaceResourceKey('workspace-a', 'work-calendar')
    const bookings = workspaceResourceKey('workspace-a', 'equipment-bookings:camera')
    const otherCalendar = workspaceResourceKey('workspace-b', 'work-calendar')
    queryClient.setQueryData(calendar, [])
    queryClient.setQueryData(bookings, [])
    queryClient.setQueryData(otherCalendar, [])
    setWorkspaceResourceData('workspace-a', 'bookings', ['saved booking'])
    expect(queryClient.getQueryState(calendar)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(bookings)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherCalendar)?.isInvalidated).toBe(false)
  })

  test('a saved Telegram group marks the Messages snapshot stale for the next visit', () => {
    const messages = workspaceResourceKey('workspace-a', 'scheduled-messages')
    queryClient.setQueryData(messages, { groups: ['old name'] })
    setWorkspaceResourceData('workspace-a', 'telegram-groups', ['updated group'])
    expect(queryClient.getQueryState(messages)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData(messages)).toEqual({ groups: ['old name'] })
  })

  test('request changes invalidate cached request-link option labels in the same workspace', () => {
    const picker = workspaceResourceKey('workspace-a', 'checklist:item:request-link')
    const otherPicker = workspaceResourceKey('workspace-b', 'checklist:item:request-link')
    queryClient.setQueryData(picker, { options: ['old title'] })
    queryClient.setQueryData(otherPicker, { options: ['other workspace'] })
    setWorkspaceResourceData('workspace-a', 'requests:active', ['renamed request'])
    expect(queryClient.getQueryState(picker)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherPicker)?.isInvalidated).toBe(false)
  })
})
