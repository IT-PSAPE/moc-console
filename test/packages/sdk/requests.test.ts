import { describe, expect, test } from "vitest"
import { createRequestsClient } from "../../../packages/sdk/src/requests"
import type { MocTransport } from "../../../packages/sdk/src/transport"

describe("requests SDK", () => {
  test("keeps archived and status filtering as explicit operations", async () => {
    const calls: Array<{ operation: string; input: unknown; workspaceId?: string }> = []
    const transport = {
      call: async <T>(_capability: string, operation: string, input?: unknown, workspaceId?: string) => {
        calls.push({ operation, input, workspaceId })
        return [] as T
      },
    } as MocTransport
    const client = createRequestsClient(transport)

    await client.list("workspace-1")
    await client.listByStatus("in_progress", "workspace-1")
    await client.listArchived("workspace-1")

    expect(calls).toEqual([
      { operation: "list", input: { workspaceId: "workspace-1" }, workspaceId: "workspace-1" },
      { operation: "listByStatus", input: { status: "in_progress" }, workspaceId: "workspace-1" },
      { operation: "listArchived", input: { workspaceId: "workspace-1" }, workspaceId: "workspace-1" },
    ])
  })

  test("trims comment bodies before sending and returns typed result", async () => {
    const transport = {
      call: async (_capability: string, operation: string, input?: unknown, workspaceId?: string) => {
        expect(operation).toBe("createComment")
        expect(input).toEqual({ requestId: "request-1", body: "Need a new cable" })
        expect(workspaceId).toBe("workspace-1")
        return { id: "comment-1", requestId: "request-1", body: "Need a new cable", actor: null, createdAt: "now" }
      },
    } as MocTransport
    const client = createRequestsClient(transport)

    await expect(client.createComment("request-1", "  Need a new cable  ", "workspace-1")).resolves.toMatchObject({ id: "comment-1" })
  })
})
