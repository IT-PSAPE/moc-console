import { describe, expect, test } from "vitest"
import type { MocTransport } from "../../../packages/sdk/src/transport"
import { createNotificationSettingsClient } from "../../../packages/sdk/src/notification-settings"
import { createUsersClient } from "../../../packages/sdk/src/users"
import { createWorkspacesClient } from "../../../packages/sdk/src/workspaces"

type Call = { capability: string; operation: string; input: unknown; workspaceId?: string }

function createTransport() {
  const calls: Call[] = []
  const transport = {
    call: async <T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> => {
      calls.push({ capability, operation, input, workspaceId })
      return null as T
    },
    request: async <T>(): Promise<T> => null as T,
    url: (path: string) => path,
  } satisfies MocTransport
  return { transport, calls }
}

describe("workspace, user and notification SDK clients", () => {
  test("workspace directory uses the authenticated actor and selection writes carry only updates", async () => {
    const { transport, calls } = createTransport()
    const workspaces = createWorkspacesClient(transport)
    await workspaces.directory()
    await workspaces.update("workspace-1", { description: "Ops" })
    expect(calls).toEqual([
      { capability: "workspaces", operation: "directory", input: undefined, workspaceId: undefined },
      { capability: "workspaces", operation: "update", input: { description: "Ops" }, workspaceId: "workspace-1" },
    ])
  })

  test("profile and Telegram linking never accept caller-chosen actor IDs", async () => {
    const { transport, calls } = createTransport()
    const users = createUsersClient(transport)
    await users.getProfile()
    await users.createTelegramLinkToken()
    await users.unlinkTelegram()
    expect(calls.map(({ capability, operation, input }) => ({ capability, operation, input }))).toEqual([
      { capability: "users", operation: "getProfile", input: undefined },
      { capability: "users", operation: "createTelegramLinkToken", input: undefined },
      { capability: "users", operation: "unlinkTelegram", input: undefined },
    ])
  })

  test("join request decisions carry the selected workspace for role authorization", async () => {
    const { transport, calls } = createTransport()
    const users = createUsersClient(transport)
    await users.approveJoinRequest("request-1", "workspace-1")
    await users.rejectJoinRequest("request-2", "workspace-1")

    expect(calls).toEqual([
      { capability: "users", operation: "approveJoinRequest", input: { requestId: "request-1" }, workspaceId: "workspace-1" },
      { capability: "users", operation: "rejectJoinRequest", input: { requestId: "request-2" }, workspaceId: "workspace-1" },
    ])
  })

  test("notification changes include workspace selection outside the mutation input", async () => {
    const { transport, calls } = createTransport()
    const notifications = createNotificationSettingsClient(transport)
    await notifications.updateAutoArchiveDays("workspace-1", 5, 6)
    await notifications.deleteRoute("workspace-1", "route-1")
    expect(calls).toEqual([
      { capability: "notification-settings", operation: "updateAutoArchiveDays", input: { completedRequestsDays: 5, returnedBookingsDays: 6 }, workspaceId: "workspace-1" },
      { capability: "notification-settings", operation: "deleteRoute", input: { id: "route-1" }, workspaceId: "workspace-1" },
    ])
  })
})
