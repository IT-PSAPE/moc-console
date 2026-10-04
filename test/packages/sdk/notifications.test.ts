import { describe, expect, test } from "vitest"
import { createNotificationsClient } from "../../../packages/sdk/src/notifications"
import type { MocTransport } from "../../../packages/sdk/src/transport"

describe("notifications SDK", () => {
  test("keeps authenticated notification requests on the existing HTTP routes", async () => {
    const requests: Array<{ path: string; options: unknown }> = []
    const transport = {
      request: async <T>(path: string, options?: unknown) => {
        requests.push({ path, options })
        return { ok: true, attempted: 1, dispatched: 1, failed: 0, pendingRetry: 0 } as T
      },
    } as MocTransport
    const notifications = createNotificationsClient(transport)
    const destinations = [{ groupChatId: "-100123", threadId: 4 }]

    await notifications.streamCreated("stream-1", destinations)
    await notifications.meetingUpdated("meeting-1")
    await notifications.requestAssignment("request-1", "user-1", "sound")

    expect(requests).toEqual([
      {
        path: "/api/notifications/internal/stream-created",
        options: { method: "POST", json: { streamId: "stream-1", destinations } },
      },
      {
        path: "/api/notifications/internal/meeting-updated",
        options: { method: "POST", json: { meetingId: "meeting-1" } },
      },
      {
        path: "/api/notifications/assignment",
        options: { method: "POST", json: { kind: "request", parentId: "request-1", userId: "user-1", duty: "sound" } },
      },
    ])
  })

  test("omits an empty destination override so configured routes remain active", async () => {
    let sentBody: unknown
    const transport = {
      request: async <T>(_path: string, options?: { json?: unknown }) => {
        sentBody = options?.json
        return { ok: true, attempted: 0, dispatched: 0, failed: 0, pendingRetry: 0 } as T
      },
    } as MocTransport
    const notifications = createNotificationsClient(transport)

    await notifications.streamCreated("stream-1", [])

    expect(sentBody).toEqual({ streamId: "stream-1" })
  })
})
