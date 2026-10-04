import { describe, expect, test } from "vitest"
import { createIntegrationsClient } from "../../../packages/sdk/src/integrations"
import { createStreamsClient } from "../../../packages/sdk/src/streams"
import type { MocTransport, RequestOptions } from "../../../packages/sdk/src/transport"

function recordingTransport(): { transport: MocTransport; calls: Array<{ path: string; options?: unknown }> } {
  const calls: Array<{ path: string; options?: unknown }> = []
  const transport: MocTransport = {
    url: (path) => path,
    request: async <T>(path: string, options?: RequestOptions) => {
      calls.push({ path, options })
      if (options && typeof options === "object" && "responseType" in options && options.responseType === "response") {
        return Response.json({ items: [] }) as T
      }
      return null as T
    },
    call: async <T>(capability: string, operation: string, input?: unknown, workspaceId?: string) => {
      calls.push({ path: `/api/platform/${capability}`, options: { operation, input, workspaceId } })
      return [] as T
    },
  }
  return { transport, calls }
}

describe("streams SDK", () => {
  test("uses workspace-scoped operations for stream and meeting records", async () => {
    const { transport, calls } = recordingTransport()
    const streams = createStreamsClient(transport)
    await streams.listStreams("workspace-1")
    await streams.deleteZoomMeetingsByIds(["meeting-1"], "workspace-1")

    expect(calls).toEqual([
      { path: "/api/platform/streams", options: { operation: "list", input: {}, workspaceId: "workspace-1" } },
      { path: "/api/platform/streams", options: { operation: "deleteZoomMeetingsByIds", input: { ids: ["meeting-1"] }, workspaceId: "workspace-1" } },
    ])
  })
})

describe("integrations SDK", () => {
  test("keeps provider methods and paths inside the existing API allowlisted routes", async () => {
    const { transport, calls } = recordingTransport()
    const integrations = createIntegrationsClient(transport)
    const response = await integrations.youtubeRequest("/liveBroadcasts?part=snippet", { workspaceId: "workspace-1" })
    expect(response.status).toBe(200)
    expect(calls[0]).toEqual({
      path: "/api/youtube/v3/liveBroadcasts?part=snippet",
      options: { workspaceId: "workspace-1", responseType: "response" },
    })
  })

  test("rejects absolute and traversal provider paths", async () => {
    const { transport } = recordingTransport()
    const integrations = createIntegrationsClient(transport)
    await expect(integrations.zoomRequest("https://evil.example/path")).rejects.toThrow("Provider API path is invalid")
    await expect(integrations.zoomRequest("/meetings/../users")).rejects.toThrow("Provider API path is invalid")
  })

  test("maps record resources to their matching provider and retains OAuth route contracts", async () => {
    const { transport, calls } = recordingTransport()
    const integrations = createIntegrationsClient(transport)
    await expect(integrations.fetchProviderRecords("youtube", "zoom-meetings")).rejects.toThrow("does not match")
    await integrations.exchangeZoomCode("code", "https://console.test/callback", "workspace-1")
    expect(calls[0]?.path).toBe("/api/zoom/oauth/exchange")
    expect(calls[0]?.options).toMatchObject({ method: "POST", json: { code: "code", redirectUri: "https://console.test/callback", workspaceId: "workspace-1" } })
  })
})
