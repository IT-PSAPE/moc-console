import assert from "node:assert/strict"
import { before, describe, it } from "node:test"

import type { MiniAppResponse } from "@moc/notifications"
import type { ApiRequest, ApiResponse } from "../http.js"
import type { RateLimitDecision } from "../rate-limit.js"
import { handleTelegramMiniApp, type TelegramMiniAppDeps } from "./handler.js"
import type { InitDataVerifyResult } from "./initdata.js"

before(() => {
  process.env.ALLOWED_ORIGINS = "https://request.psape.co.za"
})

function createResponse() {
  const headers = new Map<string, string>()
  let statusCode: number | null = null
  let body: unknown
  const response: ApiResponse = {
    status(code) {
      statusCode = code
      return response
    },
    json(value) {
      body = value
    },
    setHeader(name, value) {
      headers.set(name, value)
    },
  }
  return { response, headers, get status() { return statusCode }, get body() { return body } }
}

function createRequest(method: string, body?: unknown, origin = "https://request.psape.co.za"): ApiRequest {
  return { method, body, headers: { origin, "content-length": String(JSON.stringify(body ?? "").length) } }
}

function allowedDecision(): RateLimitDecision {
  return { allowed: true, degraded: false, limit: 60, remaining: 59, retryAfterSeconds: null }
}

const okDetailResponse: MiniAppResponse = {
  ok: true,
  viewer: { userId: "u1", name: "Craig", canUpdate: true },
  detail: { kind: "request", id: "r1", title: "T", trackingCode: "REQ-ABC123", status: { value: "not_started", label: "Not Started", color: "gray" }, fields: [], notes: null, actions: [], equipment: [], scanMode: null },
}

function createDeps(overrides: Partial<TelegramMiniAppDeps> = {}): TelegramMiniAppDeps {
  return {
    verify: overrides.verify ?? ((): InitDataVerifyResult => ({ ok: true, telegramUserId: "111" })),
    botToken: overrides.botToken ?? (() => "fake-token"),
    limit: overrides.limit ?? (async () => allowedDecision()),
    dispatch: overrides.dispatch ?? (async () => okDetailResponse),
  }
}

function viewBody() {
  return { op: "view", initData: "user=%7B%22id%22%3A111%7D&auth_date=1", target: { kind: "request", id: "0d3f6a30-6b8b-4e34-9a8b-9a2f6a7b0c11" } }
}

describe("handleTelegramMiniApp", () => {
  it("answers allowed preflight with the configured origin", async () => {
    const result = createResponse()
    await handleTelegramMiniApp(createRequest("OPTIONS"), result.response, createDeps())
    assert.equal(result.status, 204)
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), "https://request.psape.co.za")
  })

  it("rejects browser calls from unconfigured origins", async () => {
    const result = createResponse()
    await handleTelegramMiniApp(createRequest("POST", viewBody(), "https://evil.example"), result.response, createDeps())
    assert.equal(result.status, 403)
  })

  it("rejects non-POST methods", async () => {
    const result = createResponse()
    await handleTelegramMiniApp(createRequest("GET"), result.response, createDeps())
    assert.equal(result.status, 405)
  })

  it("rejects an oversized body", async () => {
    const result = createResponse()
    const request = createRequest("POST", viewBody())
    request.headers = { ...request.headers, "content-length": String(20 * 1024) }
    await handleTelegramMiniApp(request, result.response, createDeps())
    assert.equal(result.status, 413)
  })

  it("rejects a structurally invalid body before verifying initData", async () => {
    const result = createResponse()
    const verify = () => { throw new Error("should not be called") }
    await handleTelegramMiniApp(createRequest("POST", { op: "view" }), result.response, createDeps({ verify }))
    assert.equal(result.status, 400)
  })

  it("returns unauthorized when initData fails verification", async () => {
    const result = createResponse()
    const deps = createDeps({ verify: () => ({ ok: false, reason: "expired" }) })
    await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { ok: false, error: "unauthorized", message: "Your session has expired — reopen this from Telegram." })
  })

  it("enforces fail-closed rate limiting per Telegram user", async () => {
    const result = createResponse()
    const deps = createDeps({ limit: async () => ({ allowed: false, degraded: false, limit: 60, remaining: 0, retryAfterSeconds: 9 }) })
    await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
    assert.equal(result.status, 429)
    assert.equal(result.headers.get("Retry-After"), "9")
  })

  it("returns 503 when rate-limit storage is unavailable", async () => {
    const result = createResponse()
    const deps = createDeps({ limit: async () => { throw new Error("unavailable") } })
    await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
    assert.equal(result.status, 503)
  })

  it("dispatches a valid view request and returns the op's response", async () => {
    const result = createResponse()
    let seenTelegramUserId: string | null = null
    const deps = createDeps({
      dispatch: async (telegramUserId) => {
        seenTelegramUserId = telegramUserId
        return okDetailResponse
      },
    })
    await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, okDetailResponse)
    assert.equal(seenTelegramUserId, "111")
  })

  for (const [error, expectedStatus] of [
    ["not_linked", 403],
    ["forbidden", 403],
    ["not_found", 404],
    ["invalid_transition", 409],
    ["invalid", 400],
  ] as const) {
    it(`maps MiniAppErrorCode "${error}" to HTTP ${expectedStatus}`, async () => {
      const result = createResponse()
      const deps = createDeps({ dispatch: async () => ({ ok: false, error, message: "nope" }) })
      await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
      assert.equal(result.status, expectedStatus)
    })
  }

  it("returns a generic invalid response when the op throws unexpectedly", async () => {
    const result = createResponse()
    const deps = createDeps({ dispatch: async () => { throw new Error("boom") } })
    await handleTelegramMiniApp(createRequest("POST", viewBody()), result.response, deps)
    assert.equal(result.status, 400)
  })
})
