import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createZoomProxyHandler } from "../api/zoom/v2/[...path].js"
import {
  resolveProviderRecordsResponse,
  type ProviderRecordsReader,
  type ProviderRecordsResource,
} from "./provider-records.js"

type CapturedResponse = {
  body: string | Uint8Array | undefined
  end: (body?: string | Uint8Array) => void
  headers: Record<string, string>
  setHeader: (name: string, value: string) => void
  statusCode: number
}

function createResponse(): CapturedResponse {
  const response: CapturedResponse = {
    body: undefined,
    end(body) {
      response.body = body
    },
    headers: {},
    setHeader(name, value) {
      response.headers[name] = value
    },
    statusCode: 200,
  }
  return response
}

describe("provider records resolver", () => {
  it("serves Zoom records only after gateway authentication, authorization, and rate limiting", async () => {
    const calls: string[] = []
    const response = createResponse()
    const handler = createZoomProxyHandler({
      authenticate: async () => {
        calls.push("authenticate")
        return { email: null, userId: "user-1" }
      },
      authorize: async (userId, workspaceId, permission) => {
        calls.push(`authorize:${userId}:${workspaceId}:${permission}`)
      },
      proxyRequest: async () => {
        throw new Error("The local records route must not be forwarded to Zoom")
      },
      rateLimit: async () => {
        calls.push("rate-limit")
        return true
      },
      readRecords: async (resource, workspaceId, id) => {
        calls.push(`read:${resource}:${workspaceId}:${id}`)
        return [{ id, join_url: "https://zoom.us/j/123", password: "secret" }]
      },
    })

    await handler({
      headers: {
        "x-moc-session": "session-token",
        "x-moc-workspace": "workspace-1",
      },
      method: "GET",
      url: "/api/zoom/v2/moc-records?id=00000000-0000-4000-8000-000000000001",
    }, response)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(calls, [
      "authenticate",
      "authorize:user-1:workspace-1:can_read",
      "rate-limit",
      "read:zoom-meetings:workspace-1:00000000-0000-4000-8000-000000000001",
    ])
    assert.deepEqual(JSON.parse(String(response.body)), {
      records: [{
        id: "00000000-0000-4000-8000-000000000001",
        join_url: "https://zoom.us/j/123",
        password: "secret",
      }],
    })
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
    assert.equal(response.headers["CDN-Cache-Control"], "no-store")
    assert.equal(response.headers["Vercel-CDN-Cache-Control"], "no-store")
  })

  it("returns one Zoom meeting for a valid record ID", async () => {
    const seen: Array<{ id: string | null; resource: ProviderRecordsResource; workspaceId: string }> = []
    const readRecords: ProviderRecordsReader = async (resource, workspaceId, id) => {
      seen.push({ id, resource, workspaceId })
      return [{ id, join_url: "https://zoom.us/j/123", password: "secret" }]
    }

    const result = await resolveProviderRecordsResponse(
      "zoom",
      "/moc-records?id=00000000-0000-4000-8000-000000000001",
      "workspace-1",
      readRecords,
    )

    assert.equal(result.status, 200)
    assert.deepEqual(seen, [{
      id: "00000000-0000-4000-8000-000000000001",
      resource: "zoom-meetings",
      workspaceId: "workspace-1",
    }])
    assert.deepEqual(result.body, {
      records: [{
        id: "00000000-0000-4000-8000-000000000001",
        join_url: "https://zoom.us/j/123",
        password: "secret",
      }],
    })
  })

  it("returns the YouTube stream list for the workspace", async () => {
    const seenResources: ProviderRecordsResource[] = []
    const readRecords: ProviderRecordsReader = async (resource) => {
      seenResources.push(resource)
      return [{ id: "stream-1", ingestion_url: "rtmp://example.com/live", stream_key: "stream-secret" }]
    }

    const result = await resolveProviderRecordsResponse("youtube", "/moc-records", "workspace-1", readRecords)

    assert.equal(result.status, 200)
    assert.deepEqual(seenResources, ["youtube-streams"])
    assert.deepEqual(result.body, {
      records: [{ id: "stream-1", ingestion_url: "rtmp://example.com/live", stream_key: "stream-secret" }],
    })
  })

  it("rejects an invalid record ID before reading sensitive records", async () => {
    let readCalled = false
    const readRecords: ProviderRecordsReader = async () => {
      readCalled = true
      return []
    }

    const result = await resolveProviderRecordsResponse(
      "zoom",
      "/moc-records?id=not-a-uuid",
      "workspace-1",
      readRecords,
    )

    assert.deepEqual(result, { status: 400, body: { error: "Invalid record ID" } })
    assert.equal(readCalled, false)
  })
})
