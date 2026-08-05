import assert from "node:assert/strict"
import { describe, it } from "node:test"
import publicNotificationWake from "../api/notify/[kind].js"
import youTubeProxy from "../api/youtube/v3/[...path].js"
import type { ApiRequest, ApiResponse } from "./http.js"
import { getRuntimeReadiness, startApiRequest } from "./observability.js"

type CapturedResponse = ApiResponse & {
  body: unknown
  headers: Record<string, string>
  statusCode: number
}

type CapturedProviderResponse = {
  body: string | Uint8Array | undefined
  end: (body?: string | Uint8Array) => void
  headers: Record<string, string>
  setHeader: (name: string, value: string) => void
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

function createProviderResponse(): CapturedProviderResponse {
  const headers: Record<string, string> = {}
  const response: CapturedProviderResponse = {
    body: undefined,
    end(body?: string | Uint8Array) {
      response.body = body
    },
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    statusCode: 200,
  }
  return response
}

describe("observability", () => {
  it("runtime readiness does not expose configuration values", () => {
    const readiness = getRuntimeReadiness({
      ALLOWED_ORIGINS: "https://console.example.com",
      SUPABASE_SECRET_KEY: "secret-value",
      VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
      VITE_SUPABASE_URL: "https://project.supabase.co",
    })

    assert.deepEqual(readiness, { deployment: "abcdef123456", ready: true })
    assert.equal(getRuntimeReadiness({}).ready, false)
  })

  it("request correlation preserves a valid supplied request ID", () => {
    const request: ApiRequest = { headers: { "x-request-id": "monitor-123" } }
    const response = createResponse()

    const context = startApiRequest(request, response)

    assert.equal(context.requestId, "monitor-123")
    assert.equal(response.headers["X-Request-Id"], "monitor-123")
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
  })

  it("request correlation replaces invalid request IDs", () => {
    const request: ApiRequest = { headers: { "x-request-id": "bad request id" } }
    const response = createResponse()

    const context = startApiRequest(request, response)

    assert.notEqual(context.requestId, "bad request id")
    assert.match(context.requestId, /^[A-Za-z0-9._-]{1,128}$/)
  })

  it("adds correlation headers before a CORS preflight finishes", async () => {
    const previousAllowedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.com"
    const response = createResponse()

    try {
      await publicNotificationWake({
        headers: { origin: "https://console.example.com", "x-request-id": "preflight-123" },
        method: "OPTIONS",
        query: { kind: "request" },
      }, response)
    } finally {
      if (previousAllowedOrigins === undefined) {
        delete process.env.ALLOWED_ORIGINS
      } else {
        process.env.ALLOWED_ORIGINS = previousAllowedOrigins
      }
    }

    assert.equal(response.statusCode, 204)
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://console.example.com")
    assert.equal(response.headers["Access-Control-Expose-Headers"], "X-Request-Id, Retry-After")
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
    assert.equal(response.headers["X-Request-Id"], "preflight-123")
  })

  it("also observes provider-proxy preflights", async () => {
    const previousAllowedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.com"
    const response = createProviderResponse()

    try {
      await youTubeProxy({
        headers: { origin: "https://console.example.com", "x-request-id": "youtube-options-123" },
        method: "OPTIONS",
      }, response)
    } finally {
      if (previousAllowedOrigins === undefined) {
        delete process.env.ALLOWED_ORIGINS
      } else {
        process.env.ALLOWED_ORIGINS = previousAllowedOrigins
      }
    }

    assert.equal(response.statusCode, 204)
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://console.example.com")
    assert.equal(response.headers["Access-Control-Expose-Headers"], "X-Request-Id, Retry-After")
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
    assert.equal(response.headers["X-Request-Id"], "youtube-options-123")
  })
})
