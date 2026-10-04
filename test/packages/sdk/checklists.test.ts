import { describe, expect, test } from "vitest"
import { createChecklistsClient } from "../../../packages/sdk/src/checklists"
import type { MocTransport } from "../../../packages/sdk/src/transport"

describe("checklists SDK", () => {
  test("uses the atomic template run operation with existing override defaults", async () => {
    const calls: Array<{ operation: string; input: unknown; workspaceId?: string }> = []
    const transport = {
      call: async <T>(_capability: string, operation: string, input?: unknown, workspaceId?: string) => {
        calls.push({ operation, input, workspaceId })
        return "run-1" as T
      },
    } as MocTransport
    const client = createChecklistsClient(transport)

    await client.createFromTemplate("template-1", { name: "Morning Run", scheduledAt: "2026-10-04T07:00:00.000Z" }, "workspace-1")

    expect(calls).toEqual([{
      operation: "createFromTemplate",
      workspaceId: "workspace-1",
      input: { templateId: "template-1", overrides: { name: "Morning Run", scheduledAt: "2026-10-04T07:00:00.000Z" } },
    }])
  })

  test("returns whether a checklist assignment was newly created", async () => {
    const transport = {
      call: async (_capability: string, operation: string, input?: unknown, workspaceId?: string) => {
        expect(operation).toBe("addAssignee")
        expect(input).toEqual({ itemId: "item-1", userId: "user-1" })
        expect(workspaceId).toBe("workspace-1")
        return true
      },
    } as MocTransport
    const client = createChecklistsClient(transport)

    await expect(client.addAssignee("item-1", "user-1", "workspace-1")).resolves.toBe(true)
  })
})
