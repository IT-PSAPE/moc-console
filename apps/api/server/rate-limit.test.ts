import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  consumeRateLimit,
  hashRateLimitRequestSubject,
  hashRateLimitSubject,
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "./rate-limit.js"
import type { ApiRequest, ApiResponse } from "./http.js"
import type { RateLimitStore } from "./rate-limit.js"

function createStore(result: unknown): RateLimitStore {
  return {
    async consume(): Promise<unknown> {
      return result
    },
  }
}

function createResponse(): { response: ApiResponse; headers: Map<string, string>; status: number | null; body: unknown } {
  const headers = new Map<string, string>()
  let status: number | null = null
  let body: unknown
  const response: ApiResponse = {
    status(code: number): ApiResponse {
      status = code
      return response
    },
    json(value: unknown): void {
      body = value
    },
    setHeader(name: string, value: string): void {
      headers.set(name, value)
    },
  }
  return {
    response,
    headers,
    get status() {
      return status
    },
    get body() {
      return body
    },
  }
}

describe("rate limits", () => {
  it("uses named policies with deliberate storage-failure behavior", () => {
    assert.equal(RATE_LIMIT_POLICIES.publicNotificationWake.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.signedIngest.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.oauthMutation.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.providerProxyRead.failureMode, "open")
    assert.equal(RATE_LIMIT_POLICIES.providerProxyWrite.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.telegramWebhook.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.authenticatedNotificationMutation.failureMode, "closed")
    assert.equal(RATE_LIMIT_POLICIES.authenticatedNotificationMutation.limit, 30)
  })

  it("hashes a stable, domain-separated subject instead of persisting its raw parts", () => {
    const subject = hashRateLimitSubject(["workspace_123", "user_456"])
    assert.match(subject, /^[a-f0-9]{64}$/)
    assert.equal(subject, hashRateLimitSubject(["workspace_123", "user_456"]))
    assert.notEqual(subject, hashRateLimitSubject(["user_456", "workspace_123"]))
    assert.doesNotMatch(subject, /workspace_123|user_456/)
  })

  it("hashes the originating client address instead of returning the raw header", () => {
    const request: ApiRequest = { headers: { "x-forwarded-for": "203.0.113.99, 10.0.0.1" } }
    const subject = hashRateLimitRequestSubject(request, ["request_123"])
    assert.match(subject, /^[a-f0-9]{64}$/)
    assert.doesNotMatch(subject, /203\.0\.113\.99|request_123/)
  })

  it("does not let an oversized forwarded-address header break request handling", () => {
    const request: ApiRequest = { headers: { "x-forwarded-for": "x".repeat(129) } }
    assert.equal(
      hashRateLimitRequestSubject(request, ["request_123"]),
      hashRateLimitRequestSubject({ headers: {} }, ["request_123"]),
    )
  })

  it("returns a bounded decision from the durable RPC", async () => {
    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.oauthMutation,
      hashRateLimitSubject(["user_123", "youtube"]),
      createStore([{ allowed: false, limit_value: 20, remaining: 0, retry_after_seconds: 42 }]),
    )

    assert.deepEqual(decision, {
      allowed: false,
      limit: 20,
      remaining: 0,
      retryAfterSeconds: 42,
      degraded: false,
    })
  })

  it("fails closed when mutation protection cannot reach storage", async () => {
    const unavailableStore: RateLimitStore = {
      async consume(): Promise<unknown> {
        throw new Error("database unavailable")
      },
    }

    await assert.rejects(
      consumeRateLimit(
        RATE_LIMIT_POLICIES.providerProxyWrite,
        hashRateLimitSubject(["user_123", "youtube"]),
        unavailableStore,
      ),
      RateLimitUnavailableError,
    )
  })

  it("fails open only for provider reads when storage is unavailable", async () => {
    const unavailableStore: RateLimitStore = {
      async consume(): Promise<unknown> {
        throw new Error("database unavailable")
      },
    }

    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.providerProxyRead,
      hashRateLimitSubject(["user_123", "youtube"]),
      unavailableStore,
    )
    assert.deepEqual(decision, {
      allowed: true,
      limit: 120,
      remaining: null,
      retryAfterSeconds: null,
      degraded: true,
    })
  })

  it("does not hide an invalid storage contract behind a fail-open read policy", async () => {
    await assert.rejects(
      consumeRateLimit(
        RATE_LIMIT_POLICIES.providerProxyRead,
        hashRateLimitSubject(["user_123", "youtube"]),
        createStore([{ allowed: true, limit_value: 999, remaining: 998, retry_after_seconds: 0 }]),
      ),
      /policy mismatch/,
    )
  })

  it("emits cache-safe retry metadata for a rejected request", () => {
    const result = createResponse()
    writeRateLimitExceeded(result.response, {
      allowed: false,
      limit: 12,
      remaining: 0,
      retryAfterSeconds: 17,
      degraded: false,
    })

    assert.equal(result.status, 429)
    assert.equal(result.headers.get("Retry-After"), "17")
    assert.equal(result.headers.get("Cache-Control"), "no-store")
    assert.deepEqual(result.body, {
      code: "rate_limited",
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: 17,
    })
  })

  it("gives closed routes a retryable response when storage is unavailable", () => {
    const result = createResponse()
    writeRateLimitUnavailable(result.response)

    assert.equal(result.status, 503)
    assert.equal(result.headers.get("Retry-After"), "5")
    assert.equal(result.headers.get("Cache-Control"), "no-store")
  })

  it("also writes retry metadata to Vercel's statusCode/end response shape", () => {
    const headers = new Map<string, string>()
    let body = ""
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string): void {
        headers.set(name, value)
      },
      end(value?: string | Uint8Array): void {
        body = String(value)
      },
    }

    writeRateLimitExceeded(response, {
      allowed: false,
      limit: 30,
      remaining: 0,
      retryAfterSeconds: 9,
      degraded: false,
    })

    assert.equal(response.statusCode, 429)
    assert.equal(headers.get("Retry-After"), "9")
    assert.deepEqual(JSON.parse(body), {
      code: "rate_limited",
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: 9,
    })
  })
})
