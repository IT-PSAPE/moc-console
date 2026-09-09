import { describe, expect, test } from "bun:test"
import { getWorkspaceResourceState, loadWorkspaceResource, setWorkspaceResourceData } from "./workspace-resource-cache"

describe("workspace resource cache", () => {
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
    await load

    const state = getWorkspaceResourceState<string[]>(workspaceId, resource)
    expect(state.data).toEqual([])
    expect(state.isLoading).toBe(false)
  })
})
