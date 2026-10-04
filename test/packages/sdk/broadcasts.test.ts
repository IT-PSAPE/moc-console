import { describe, expect, test } from "bun:test"
import { createBroadcastsClient } from "../../../packages/sdk/src/broadcasts"
import type { MocTransport } from "../../../packages/sdk/src/transport"

describe("broadcasts SDK", () => {
  test("sends authoring and public reads through their named operations", async () => {
    const calls: Array<{ capability: string; operation: string; input: unknown; workspaceId?: string }> = []
    const client = createBroadcastsClient({
      async call<T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> {
        calls.push({ capability, operation, input, workspaceId })
        return null as T
      },
    } as MocTransport)
    const input = { id: "broadcast-id", workspaceId: "workspace-id", expectedUpdatedAt: "now", title: "Live", description: "", kind: "audio" as const, items: [] }

    await client.list("workspace-id")
    await client.getPublicBySlug("live")
    await client.create({ id: input.id, workspaceId: input.workspaceId, title: input.title, description: input.description, kind: input.kind, items: input.items, slug: "live" })
    await client.update(input)
    await client.delete({ id: input.id, workspaceId: input.workspaceId })

    expect(calls.map(({ capability, operation, workspaceId }) => ({ capability, operation, workspaceId }))).toEqual([
      { capability: "broadcasts", operation: "list", workspaceId: "workspace-id" },
      { capability: "broadcasts", operation: "getPublicBySlug", workspaceId: undefined },
      { capability: "broadcasts", operation: "create", workspaceId: "workspace-id" },
      { capability: "broadcasts", operation: "update", workspaceId: "workspace-id" },
      { capability: "broadcasts", operation: "delete", workspaceId: "workspace-id" },
    ])
  })

  test("opens the replayable SSE path and returns a close action", () => {
    const listeners: Record<string, EventListener> = {}
    let requestedUrl = ""
    let closed = false
    class EventSourceStub {
      constructor(url: string) { requestedUrl = url }
      addEventListener(type: string, listener: EventListener) { listeners[type] = listener }
      close() { closed = true }
    }
    const originalEventSource = globalThis.EventSource
    globalThis.EventSource = EventSourceStub as unknown as typeof EventSource
    const client = createBroadcastsClient({
      url(path: string) { return `https://api.example.test${path}` },
    } as MocTransport)
    const changes: unknown[] = []

    const unsubscribe = client.subscribe("broadcast-id", (change) => changes.push(change), "12")
    listeners.changed?.(new MessageEvent("changed", { data: JSON.stringify({ type: "changed", revision: "13" }) }))
    unsubscribe()
    globalThis.EventSource = originalEventSource

    expect(requestedUrl).toBe("https://api.example.test/api/public/broadcasts/broadcast-id/events?after=12")
    expect(changes).toEqual([{ type: "changed", revision: "13" }])
    expect(closed).toBe(true)
  })
})
