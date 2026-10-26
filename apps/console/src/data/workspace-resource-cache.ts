import { queryClient } from "@/lib/query-client"
import { consoleQueryPolicy } from "@/lib/console-query-policy"
import { refreshChangedItemActivity } from './item-discussion-cache'

export type WorkspaceResourceState<T> = {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isLoaded: boolean
}

export function workspaceResourceKey(workspaceId: string | null, resource: string) {
  return ["workspace", workspaceId, resource] as const
}

const dependents: Record<string, readonly string[]> = {
  requests: ['work-calendar', 'request-linked-records'],
  bookings: ['work-calendar', 'request-linked-records', 'equipment-bookings'],
  'venue-bookings': ['work-calendar', 'request-linked-records'],
  checklists: ['request-linked-records'],
  streams: ['request-linked-records'],
  'zoom-meetings': ['request-linked-records'],
  venues: ['work-calendar', 'venue-bookings', 'request-linked-records'],
  'venue-events': ['work-calendar', 'venue-bookings'],
  'telegram-groups': ['scheduled-messages'],
  users: ['members', 'users', 'scheduled-messages'],
  'member-types': ['scheduled-messages'],
}

function refreshDependents(workspaceId: string, resource: string): void {
  const family = resource.split(':')[0]
  const affected = dependents[family]
  if (!affected) return
  const filters = {
    queryKey: ['workspace', workspaceId],
    predicate: (query: { queryKey: readonly unknown[] }): boolean => {
      const candidate = query.queryKey[2]
      return typeof candidate === 'string' && candidate !== resource
        && (affected.includes(candidate.split(':')[0]) || (family === 'requests' && candidate.endsWith(':request-link')))
    },
  }
  void queryClient.cancelQueries(filters)
  void queryClient.invalidateQueries(filters)
}

function refreshDetails(queryKey: ReturnType<typeof workspaceResourceKey>): void {
  const detailKey = [...queryKey, "detail"]
  void queryClient.cancelQueries({ queryKey: detailKey })
  void queryClient.invalidateQueries({ queryKey: detailKey })
}

export function getWorkspaceResourceState<T>(workspaceId: string | null, resource: string): WorkspaceResourceState<T> {
  const state = workspaceId ? queryClient.getQueryState<T>(workspaceResourceKey(workspaceId, resource)) : undefined
  return {
    data: state?.data,
    error: state?.error ?? null,
    isLoading: state?.fetchStatus === "fetching",
    isLoaded: state?.data !== undefined,
  }
}

export function loadWorkspaceResource<T>(workspaceId: string, resource: string, fetcher: (workspaceId: string) => Promise<T>, force = false): Promise<T> {
  const queryKey = workspaceResourceKey(workspaceId, resource)
  const previous = queryClient.getQueryData<T>(queryKey)
  return queryClient.fetchQuery({
    ...consoleQueryPolicy(resource),
    queryKey,
    queryFn: () => fetcher(workspaceId),
    ...(force ? { staleTime: 0 } : {}),
  }).then((data) => {
    refreshChangedItemActivity(workspaceId, resource, previous, queryClient.getQueryData<T>(queryKey))
    return data
  })
}

export function setWorkspaceResourceData<T>(workspaceId: string, resource: string, data: T): void {
  const queryKey = workspaceResourceKey(workspaceId, resource)
  const previous = queryClient.getQueryData<T>(queryKey)
  void queryClient.cancelQueries({ queryKey, exact: true })
  queryClient.setQueryData<T>(queryKey, data)
  refreshChangedItemActivity(workspaceId, resource, previous, queryClient.getQueryData<T>(queryKey))
  refreshDetails(queryKey)
  refreshDependents(workspaceId, resource)
}

export function setWorkspaceDetailData<T>(workspaceId: string, resource: string, id: string, data: T | null): void {
  const queryKey = [...workspaceResourceKey(workspaceId, resource), "detail", id]
  const previous = queryClient.getQueryData<T | null>(queryKey)
  void queryClient.cancelQueries({ queryKey, exact: true })
  queryClient.setQueryData<T | null>(queryKey, data)
  refreshChangedItemActivity(workspaceId, resource, previous, queryClient.getQueryData<T | null>(queryKey), id)
}

export function updateWorkspaceResourceData<T>(workspaceId: string, resource: string, updater: (current: T | undefined) => T | undefined): void {
  const queryKey = workspaceResourceKey(workspaceId, resource)
  const previous = queryClient.getQueryData<T>(queryKey)
  void queryClient.cancelQueries({ queryKey, exact: true })
  queryClient.setQueryData<T>(queryKey, updater)
  refreshChangedItemActivity(workspaceId, resource, previous, queryClient.getQueryData<T>(queryKey))
  refreshDetails(queryKey)
  refreshDependents(workspaceId, resource)
}

export function invalidateWorkspaceResource(workspaceId: string, resource: string): void {
  const queryKey = workspaceResourceKey(workspaceId, resource)
  void queryClient.cancelQueries({ queryKey })
  void queryClient.invalidateQueries({ queryKey })
  refreshDependents(workspaceId, resource)
}

export function clearWorkspaceResources(): void {
  // Clearing destroys pending queries too; late responses cannot reinsert old account data.
  queryClient.clear()
}
