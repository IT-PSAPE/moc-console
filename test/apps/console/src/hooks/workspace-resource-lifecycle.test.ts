import { afterEach, beforeEach, expect, test } from 'vitest'
import { renderQueryHook } from '../../../../helpers/query-hook'
import { useWorkspaceResource } from '../../../../../apps/console/src/hooks/use-workspace-resource'
import { clearCurrentWorkspaceCache, setCurrentWorkspaceIdMirror } from '../../../../../apps/console/src/data/current-workspace'
import { getWorkspaceResourceState, setWorkspaceResourceData, workspaceResourceKey } from '../../../../../apps/console/src/data/workspace-resource-cache'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'

const fetcher = async (): Promise<string[]> => []
function useResource() {
  return useWorkspaceResource({ emptyValue: [] as string[], fetcher, resource: 'requests', workspaceId: 'workspace' })
}

beforeEach(() => { clearCurrentWorkspaceCache(); setCurrentWorkspaceIdMirror('workspace') })
afterEach(() => { clearCurrentWorkspaceCache() })

test('a completed save from the previous session cannot repopulate cleared data', () => {
  const actions = renderQueryHook(useResource, queryClient)
  clearCurrentWorkspaceCache()
  actions.setData(['old account'])
  actions.updateData(current => [...current, 'old account'])
  actions.setDetailData('item', { title: 'old account' })
  expect(getWorkspaceResourceState('workspace', 'requests').data).toBeUndefined()
  expect(queryClient.getQueryData([...workspaceResourceKey('workspace', 'requests'), 'detail', 'item'])).toBeUndefined()
})

test('an old save cannot replace data loaded for the new session in the same workspace', () => {
  const actions = renderQueryHook(useResource, queryClient)
  clearCurrentWorkspaceCache()
  setCurrentWorkspaceIdMirror('workspace')
  setWorkspaceResourceData('workspace', 'requests', ['new account'])
  actions.updateData(current => [...current, 'old account'])
  expect(getWorkspaceResourceState('workspace', 'requests').data).toEqual(['new account'])
})

test('saving an item before its collection is loaded cannot seed a partial collection', async () => {
  const actions = renderQueryHook(useResource, queryClient)
  actions.updateData(current => [...current, 'saved item'])
  expect(getWorkspaceResourceState('workspace', 'requests').data).toBeUndefined()
  await actions.load()
  expect(getWorkspaceResourceState('workspace', 'requests').data).toEqual([])
})

test('saving a detail updates a deep link while leaving its unfetched collection incomplete', () => {
  const actions = renderQueryHook(useResource, queryClient)
  const detailKey = [...workspaceResourceKey('workspace', 'requests'), 'detail', 'item']
  queryClient.setQueryData(detailKey, 'old item')
  actions.updateData(current => [...current, 'saved item'])
  actions.setDetailData('item', 'saved item')
  expect(queryClient.getQueryData(detailKey)).toBe('saved item')
  expect(getWorkspaceResourceState('workspace', 'requests').data).toBeUndefined()
})

test('a deferred collection loads on demand and reuses its fresh response', async () => {
  let reads = 0
  async function fetchItems(): Promise<string[]> { reads += 1; return ['all items'] }
  function useDeferredResource() {
    return useWorkspaceResource({ emptyValue: [] as string[], fetcher: fetchItems, resource: 'deferred', workspaceId: 'workspace', deferInitialLoad: true })
  }
  const actions = renderQueryHook(useDeferredResource, queryClient)
  expect(reads).toBe(0)
  expect(actions.isInitialLoading).toBe(true)
  await actions.load()
  await actions.load()
  const loaded = renderQueryHook(useDeferredResource, queryClient)
  expect(loaded.data).toEqual(['all items'])
  expect(loaded.isInitialLoading).toBe(false)
  expect(reads).toBe(1)
})
