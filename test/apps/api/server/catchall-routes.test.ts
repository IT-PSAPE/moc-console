import assert from "node:assert/strict"
import { describe, it } from "vitest"

import type { ApiHandler } from "../../../../apps/api/server/route-dispatch.js"
import { routeParameterSegments } from "../../../../apps/api/server/route-dispatch.js"
import { createProviderRouter } from "../../../../apps/api/server/routes/provider-router.js"
import { createNotificationRouter } from "../../../../apps/api/server/routes/notifications/router.js"
import type { ApiRequest, ApiResponse } from "../../../../apps/api/server/http.js"

type TestResponse = ApiResponse & { body?: unknown; statusCode: number }

function createResponse(): TestResponse {
  const response: TestResponse = {
    statusCode: 200,
    status(code) { response.statusCode = code; return response },
    json(body) { response.body = body },
    setHeader() {},
  }
  return response
}

function recorder(name: string, calls: string[]): ApiHandler {
  return async (request, response) => {
    calls.push(`${name}:${String(request.query?.action ?? request.query?.event ?? "")}`)
    response.status(204).json(null)
  }
}

describe("catchall API route dispatch", () => {
  it("reads Vercel catchall arrays and falls back to the request path", () => {
    assert.deepEqual(routeParameterSegments({ query: { path: ["oauth", "exchange"] } }, "path"), ["oauth", "exchange"])
    assert.deepEqual(routeParameterSegments({ query: { path: "v3/_proxy" } }, "path"), ["v3", "_proxy"])
    assert.deepEqual(routeParameterSegments({ url: "/api/youtube/oauth/revoke" }, "path"), ["api", "youtube", "oauth", "revoke"])
  })

  it("dispatches notification paths to the existing operation handlers", async () => {
    const calls: string[] = []
    const handler = createNotificationRouter({
      assignment: recorder("assignment", calls),
      bookings: recorder("bookings", calls),
      internal: recorder("internal", calls),
      requests: recorder("requests", calls),
    })
    for (const path of ["assignment", "bookings", "requests", "internal/meeting-updated"]) {
      const request: ApiRequest = { query: { path: path.split("/") } }
      await handler(request, createResponse())
    }
    assert.deepEqual(calls, ["assignment:", "bookings:", "requests:", "internal:meeting-updated"])
  })

  it("preserves OAuth action and provider proxy dispatch paths", async () => {
    const calls: string[] = []
    const handler = createProviderRouter({
      oauth: recorder("oauth", calls),
      proxy: recorder("proxy", calls),
    }, "youtube")
    for (const path of ["oauth/exchange", "v3/_proxy"]) {
      await handler({ query: { path: path.split("/") } }, createResponse())
    }
    assert.deepEqual(calls, ["oauth:exchange", "proxy:"])
  })

  it("returns 404 for routes outside the explicit allowlist", async () => {
    const calls: string[] = []
    const response = createResponse()
    await createProviderRouter({ oauth: recorder("oauth", calls), proxy: recorder("proxy", calls) }, "zoom")(
      { query: { path: ["arbitrary", "operation"] } }, response,
    )
    assert.equal(response.statusCode, 404)
    assert.deepEqual(calls, [])
  })
})
