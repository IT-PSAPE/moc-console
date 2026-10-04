import assert from "node:assert/strict"
import { describe, it } from "vitest"
import type { ApiRequest, ApiResponse } from "../../../../apps/api/server/http.js"
import { writeCorsHeaders } from "../../../../apps/api/server/cors.js"
import { getRuntimeReadiness, startApiRequest } from "../../../../apps/api/server/observability.js"

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
      DATABASE_URL: "postgres://moc:secret-value@localhost/moc",
      MOC_AUTH_SERVICE_SECRET: "secret-value",
      MOC_AUTH_TRUSTED_ORIGINS: "https://console.example.com",
      NEON_AUTH_FUNCTION_URL: "https://auth.example.com",
      VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
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
    assert.equal(response.headers["CDN-Cache-Control"], "no-store")
    assert.equal(response.headers["Vercel-CDN-Cache-Control"], "no-store")
  })

  it("request correlation replaces invalid request IDs", () => {
    const request: ApiRequest = { headers: { "x-request-id": "bad request id" } }
    const response = createResponse()

    const context = startApiRequest(request, response)

    assert.notEqual(context.requestId, "bad request id")
    assert.match(context.requestId, /^[A-Za-z0-9._-]{1,128}$/)
  })

  it("exposes request correlation and range headers to allowed browser origins", () => {
    const previousAllowedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.com"
    const response = createResponse()

    try {
      writeCorsHeaders({ origin: "https://console.example.com" }, response, { preflight: true })
      startApiRequest({ headers: { "x-request-id": "preflight-123" } }, response)
    } finally {
      if (previousAllowedOrigins === undefined) {
        delete process.env.ALLOWED_ORIGINS
      } else {
        process.env.ALLOWED_ORIGINS = previousAllowedOrigins
      }
    }

    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://console.example.com")
    assert.equal(
      response.headers["Access-Control-Expose-Headers"],
      "X-Request-Id, Retry-After, Content-Range, Accept-Ranges, Content-Length, ETag",
    )
    assert.equal(response.headers["Cache-Control"], "no-store, max-age=0, must-revalidate")
    assert.equal(response.headers["X-Request-Id"], "preflight-123")
  })

  it("includes browser range headers in the shared preflight contract", () => {
    const previousAllowedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.com"
    const response = createProviderResponse()

    try {
      writeCorsHeaders({ origin: "https://console.example.com" }, response, { preflight: true })
    } finally {
      if (previousAllowedOrigins === undefined) {
        delete process.env.ALLOWED_ORIGINS
      } else {
        process.env.ALLOWED_ORIGINS = previousAllowedOrigins
      }
    }

    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://console.example.com")
    assert.equal(
      response.headers["Access-Control-Expose-Headers"],
      "X-Request-Id, Retry-After, Content-Range, Accept-Ranges, Content-Length, ETag",
    )
    assert.match(response.headers["Access-Control-Allow-Headers"], /range/)
  })
})
