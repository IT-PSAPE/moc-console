import { describe, expect, test, vi } from "vitest"
import { createDiscussionClient } from "../../../packages/sdk/src/discussion"
import { createMocClient } from "../../../packages/sdk/src/client"
import type { MocTransport } from "../../../packages/sdk/src/transport"

describe("discussion SDK", () => {
  test("lists activity and comments with explicit item, workspace and pagination", async () => {
    const call = vi.fn().mockResolvedValue({ items: [], nextCursor: null })
    const client = createDiscussionClient({ call } as unknown as MocTransport)
    await client.listActivity("venue-booking", "item", "workspace", "older")
    await client.listComments("request", "request", "workspace")
    expect(call.mock.calls).toEqual([
      ["discussion", "listActivity", { kind: "venue-booking", itemId: "item", cursor: "older" }, "workspace"],
      ["discussion", "listComments", { kind: "request", itemId: "request", cursor: undefined }, "workspace"],
    ])
  })

  test("trims bodies while preserving the caller's key for safe retries", async () => {
    const call = vi.fn().mockResolvedValue({ id: "submission", body: "Please review" })
    const client = createDiscussionClient({ call } as unknown as MocTransport)
    await expect(client.createComment("booking", "item", "  Please review  ", "workspace", "submission")).resolves.toMatchObject({ id: "submission", body: "Please review" })
    expect(call).toHaveBeenCalledWith("discussion", "createComment", { kind: "booking", itemId: "item", body: "Please review", idempotencyKey: "submission" }, "workspace")
  })

  test("the main client sends discussion operations through the platform boundary", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }))
    const client = createMocClient("http://localhost:5173", { fetchImpl })
    await client.discussion.listComments("scheduled-message", "occurrence", "workspace")
    expect(fetchImpl.mock.calls[0][0]).toBe("http://localhost:5173/api/platform/discussion")
    expect(JSON.parse(fetchImpl.mock.calls[0][1]?.body as string)).toEqual({ operation: "listComments", input: { kind: "scheduled-message", itemId: "occurrence" } })
    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get("X-Moc-Workspace")).toBe("workspace")
  })
})
