import { describe, expect, test } from "vitest"
import { clearWorkspaceResources, getWorkspaceResourceState, loadWorkspaceResource, setWorkspaceResourceData } from "../../../../../apps/console/src/data/workspace-resource-cache"
import { deferred } from "../../../../helpers/async"

describe("workspace resource cache", () => {
  test("clearing resources also discards in-flight data from the previous account", async () => {
    const pending = deferred<string[]>()
    const load = loadWorkspaceResource('session-workspace', 'requests', () => pending.promise)
    setWorkspaceResourceData('other-workspace', 'equipment', ['private'])
    clearWorkspaceResources()
    setWorkspaceResourceData('session-workspace', 'requests', ['new account'])
    pending.resolve(['old account'])
    await load.catch(() => undefined)

    expect(getWorkspaceResourceState('session-workspace', 'requests').data).toEqual(['new account'])
    expect(getWorkspaceResourceState('other-workspace', 'equipment').data).toBeUndefined()
  })

  test("does not restore data from a load invalidated by a destructive write", async () => {
    let resolveFetch: (value: string[]) => void = () => undefined
    const pendingFetch = new Promise<string[]>((resolve) => {
      resolveFetch = resolve
    })
    const workspaceId = "workspace-race"
    const resource = "zoom-meetings-race"

    const load = loadWorkspaceResource(workspaceId, resource, async () => pendingFetch)
    setWorkspaceResourceData(workspaceId, resource, [])
    resolveFetch(["stale meeting"])
    await load.catch(() => undefined)

    const state = getWorkspaceResourceState<string[]>(workspaceId, resource)
    expect(state.data).toEqual([])
    expect(state.isLoading).toBe(false)
  })

  test("force reloads a cached aggregate so route remounts see record changes", async () => {
    const workspaceId = "workspace-force-refresh"
    const resource = "schedule-force-refresh"
    let fetchCount = 0
    setWorkspaceResourceData(workspaceId, resource, ["stale"])

    await loadWorkspaceResource(workspaceId, resource, async () => {
      fetchCount += 1
      return ["fresh"]
    }, true)

    expect(fetchCount).toBe(1)
    expect(getWorkspaceResourceState<string[]>(workspaceId, resource).data).toEqual(["fresh"])
  })
})
