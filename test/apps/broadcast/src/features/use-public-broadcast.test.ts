import { QueryClient, QueryObserver } from "@tanstack/react-query"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { afterEach, describe, expect, test } from "vitest"
import { publicBroadcastByIdQueryKey, publicBroadcastQueryKey, usePublicBroadcast } from "../../../../../apps/broadcast/src/features/use-public-broadcast"
import { renderQueryHook } from "../../../../helpers/query-hook"

function createBroadcast(id: string, slug: string): Broadcast {
  return {
    id,
    workspaceId: "workspace-id",
    createdBy: "user-id",
    title: `Broadcast ${id}`,
    description: "",
    slug,
    kind: "audio",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    items: [],
  }
}

describe("public broadcast query cache", () => {
  let queryClient: QueryClient | undefined

  afterEach(() => {
    queryClient?.clear()
    queryClient = undefined
  })

  test("isolates slug results and keeps prior data available when a by-id refresh fails", async () => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const alpha = createBroadcast("alpha-id", "alpha-slug")
    const beta = createBroadcast("beta-id", "beta-slug")
    const alphaObserver = new QueryObserver(queryClient, { queryKey: publicBroadcastQueryKey("alpha-slug"), queryFn: async () => alpha })
    const betaObserver = new QueryObserver(queryClient, { queryKey: publicBroadcastQueryKey("beta-slug"), queryFn: async () => beta })
    const alphaUnsubscribe = alphaObserver.subscribe(() => undefined)
    const betaUnsubscribe = betaObserver.subscribe(() => undefined)

    await alphaObserver.refetch()
    await betaObserver.refetch()

    expect(alphaObserver.getCurrentResult().data?.id).toBe("alpha-id")
    expect(betaObserver.getCurrentResult().data?.id).toBe("beta-id")

    queryClient.setQueryData(publicBroadcastQueryKey("alpha-slug"), alpha)
    const byIdObserver = new QueryObserver(queryClient, {
      queryKey: publicBroadcastByIdQueryKey("alpha-id"),
      queryFn: async () => { throw new Error("offline") },
      retry: false,
    })
    const byIdUnsubscribe = byIdObserver.subscribe(() => undefined)
    await byIdObserver.refetch()

    expect(queryClient.getQueryData<Broadcast | null>(publicBroadcastQueryKey("alpha-slug"))?.id).toBe("alpha-id")
    expect(queryClient.getQueryData<Broadcast | null>(publicBroadcastQueryKey("beta-slug"))?.id).toBe("beta-id")
    alphaUnsubscribe()
    betaUnsubscribe()
    byIdUnsubscribe()
  })

  test("keeps renamed broadcasts addressable through their stable id refresh key", () => {
    const alpha = createBroadcast("alpha-id", "new-slug")
    expect(publicBroadcastByIdQueryKey(alpha.id)).toEqual(["public-broadcast-by-id", "alpha-id"])
    expect(publicBroadcastQueryKey("old-slug")).not.toEqual(publicBroadcastQueryKey("new-slug"))
  })

  test("keeps a cached player available after a failed slug refresh", async () => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const broadcast = createBroadcast("alpha-id", "alpha-slug")
    const queryKey = publicBroadcastQueryKey(broadcast.slug)
    queryClient.setQueryData(queryKey, broadcast)
    await queryClient.fetchQuery({ queryKey, queryFn: async () => { throw new Error("offline") }, staleTime: 0 }).catch(() => undefined)
    const state = renderQueryHook(() => usePublicBroadcast(broadcast.slug), queryClient)
    expect(state.broadcast?.id).toBe(broadcast.id)
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
  })
})
