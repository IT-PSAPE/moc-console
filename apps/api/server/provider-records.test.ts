import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createProviderRecordsHandler } from "../api/provider-records/[resource].js"
import { AuthError } from "./auth-guard.js"
import type { ApiRequest, ApiResponse } from "./http.js"
import type { ProviderRecordsResource } from "./provider-records.js"

type CapturedResponse = ApiResponse & {
  body: unknown
  headers: Record<string, string>
  statusCode: number
}

function createResponse(): CapturedResponse {
  const headers: Record<string, string> = {}
  const response: CapturedResponse = {
    body: undefined,
    headers,
    json(body: unknown) {
      response.body = body
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    status(statusCode: number) {
      response.statusCode = statusCode
      return response
    },
    statusCode: 200,
  }
  return response
}

function request(resource: ProviderRecordsResource, id?: string): ApiRequest {
  return {
    headers: {
      origin: "https://console.example.com",
      "x-moc-session": "session-token",
      "x-moc-workspace": "workspace-1",
    },
    method: "GET",
    query: { resource, ...(id ? { id } : {}) },
  }
}

describe("provider records route", () => {
  it("returns Zoom meeting details through an authenticated non-cacheable response", async () => {
    const previousAllowedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.com"
    const response = createResponse()
    const handler = createProviderRecordsHandler({
      authenticate: async () => ({ email: null, userId: "user-1" }),
      authorize: async () => undefined,
      readRecords: async () => [{ id: "00000000-0000-4000-8000-000000000001", join_url: "https://zoom.us/j/123", password: "secret" }],
    })

    try {
      await handler(request("zoom-meetings", "00000000-0000-4000-8000-000000000001"), response)
    } finally {
      if (previousAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS
      else process.env.ALLOWED_ORIGINS = previousAllowedOrigins
    }

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, {
      records: [{ id: "00000000-0000-4000-8000-000000000001", join_url: "https://zoom.us/j/123", password: "secret" }],
    })
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
    assert.equal(response.headers["CDN-Cache-Control"], "no-store")
    assert.equal(response.headers["Vercel-CDN-Cache-Control"], "no-store")
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://console.example.com")
  })

  it("returns YouTube ingestion details from the allow-listed resource", async () => {
    const response = createResponse()
    const seenResources: ProviderRecordsResource[] = []
    const handler = createProviderRecordsHandler({
      authenticate: async () => ({ email: null, userId: "user-1" }),
      authorize: async () => undefined,
      readRecords: async (resource) => {
        seenResources.push(resource)
        return [{ id: "stream-1", ingestion_url: "rtmp://example.com/live", stream_key: "stream-secret" }]
      },
    })

    await handler(request("youtube-streams"), response)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(seenResources, ["youtube-streams"])
    assert.deepEqual(response.body, {
      records: [{ id: "stream-1", ingestion_url: "rtmp://example.com/live", stream_key: "stream-secret" }],
    })
  })

  it("rejects requests without a valid session before reading sensitive records", async () => {
    let readCalled = false
    const response = createResponse()
    const handler = createProviderRecordsHandler({
      authenticate: async () => { throw new AuthError("Invalid session") },
      authorize: async () => undefined,
      readRecords: async () => {
        readCalled = true
        return []
      },
    })

    await handler(request("zoom-meetings"), response)

    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, { error: "Unauthorized" })
    assert.equal(readCalled, false)
  })
})
