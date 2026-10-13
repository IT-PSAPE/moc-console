import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { invalidateWorkspaceResource, loadWorkspaceResource, setWorkspaceResourceData } from "../../../../../apps/console/src/data/workspace-resource-cache"
import { useWorkspaceResource } from "../../../../../apps/console/src/hooks/use-workspace-resource"

function renderResource(workspaceId: string | null, resource: string) {
  function Probe() {
    const state = useWorkspaceResource({ emptyValue: [] as string[], fetcher: async () => [], resource, workspaceId })
    return createElement("output", null, `${state.isLoading}:${state.isInitialLoading}`)
  }

  return renderToStaticMarkup(createElement(Probe))
}

describe("useWorkspaceResource initial loading", () => {
  test("marks an uncached workspace resource as initially loading on its first render", () => {
    const workspaceId = "cold-load-contract"
    const resource = "cold-load"
    invalidateWorkspaceResource(workspaceId, resource)

    expect(renderResource(workspaceId, resource)).toContain("true:true")
  })

  test("treats a loaded empty collection as complete", () => {
    const workspaceId = "loaded-empty-contract"
    const resource = "loaded-empty"
    setWorkspaceResourceData(workspaceId, resource, [])

    expect(renderResource(workspaceId, resource)).toContain("false:false")
  })

  test("does not classify a failed load as initial loading", async () => {
    const workspaceId = "failed-load-contract"
    const resource = "failed-load"
    await loadWorkspaceResource(workspaceId, resource, async () => { throw new Error("failed") }).catch(() => undefined)

    expect(renderResource(workspaceId, resource)).toContain("false:false")
  })

  test("keeps cached data visible during a background refresh", () => {
    const workspaceId = "background-refresh-contract"
    const resource = "background-refresh"
    setWorkspaceResourceData(workspaceId, resource, ["cached"])
    void loadWorkspaceResource(workspaceId, resource, async () => new Promise<string[]>(() => undefined), true)

    expect(renderResource(workspaceId, resource)).toContain("true:false")
  })

  test("does not wait for a workspace when none is selected", () => {
    expect(renderResource(null, "no-workspace")).toContain("false:false")
  })
})
