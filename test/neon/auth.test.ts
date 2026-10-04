import { describe, expect, it } from "bun:test"
import { randomUUID } from "node:crypto"
import { createInternalAuthHeaders } from "../../packages/backend/src/auth/internal-request.js"
import { createAuthFunctionHandler } from "../../neon/functions/auth.js"
import { queryRows } from "../../packages/backend/src/database.js"

const secret = "test-service-secret-that-is-long-enough"
const now = 1_800_000_000_000
const trustedOrigin = "https://console.example.test"

function signedRequest(nonce: string, cookie = "moc.session=opaque") {
  const signed = { method: "GET", path: "/api/auth/get-session", body: "", origin: trustedOrigin, cookie, timestamp: now, nonce }
  const headers = new Headers(createInternalAuthHeaders(signed, secret))
  if (cookie) headers.set("cookie", cookie)
  return new Request(`https://neon.example.test${signed.path}`, { method: signed.method, headers })
}

describe("Neon auth Function boundary", () => {
  it("accepts a valid signed API request and passes only the verified origin and cookie to Better Auth", async () => {
    const handled: Request[] = []
    const handler = createAuthFunctionHandler({
      secret,
      trustedOrigins: [trustedOrigin],
      now: () => now,
      claimNonce: async () => true,
      handleAuth: async (request) => {
        handled.push(request)
        return Response.json({ session: null, user: null })
      },
    })

    const response = await handler(signedRequest("nonce_12345678901234567890"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ session: null, user: null })
    expect(handled[0]?.headers.get("origin")).toBe(trustedOrigin)
    expect(handled[0]?.headers.get("cookie")).toBe("moc.session=opaque")
  })

  it("rejects forged signatures and replayed nonces before auth dispatch", async () => {
    let dispatches = 0
    let nonceClaims = 0
    const handler = createAuthFunctionHandler({
      secret,
      trustedOrigins: [trustedOrigin],
      now: () => now,
      claimNonce: async () => { nonceClaims += 1; return nonceClaims === 1 },
      handleAuth: async () => { dispatches += 1; return Response.json({ ok: true }) },
    })
    const forged = signedRequest("nonce_abcdefghijklmno123456");
    forged.headers.set("x-moc-auth-signature", "00".repeat(32))

    expect((await handler(forged)).status).toBe(401)
    const signed = signedRequest("nonce_abcdefghijklmno123456")
    expect((await handler(signed)).status).toBe(200)
    expect((await handler(signedRequest("nonce_abcdefghijklmno123456"))).status).toBe(409)
    expect(dispatches).toBe(1)
  })
})

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
if (databaseUrl) process.env.DATABASE_URL = databaseUrl

describe.skipIf(!databaseUrl)("Neon auth nonce database integration", () => {
  it("claims each signed nonce once through the worker role", async () => {
    const nonce = `auth-integration-${randomUUID()}`
    const timestamp = Date.now()
    const signed = {
      method: "GET",
      path: "/api/auth/get-session",
      body: "",
      origin: trustedOrigin,
      cookie: "",
      timestamp,
      nonce,
    }
    const headers = new Headers(createInternalAuthHeaders(signed, secret))
    const request = () => new Request(`https://neon.example.test${signed.path}`, { headers })
    const handler = createAuthFunctionHandler({
      secret,
      trustedOrigins: [trustedOrigin],
      now: () => timestamp,
      handleAuth: async () => Response.json({ user: null, session: null }),
    })

    try {
      expect((await handler(request())).status).toBe(200)
      expect((await handler(request())).status).toBe(409)
    } finally {
      await queryRows("DELETE FROM moc_auth.internal_request_nonce WHERE nonce = $1", [nonce])
    }
  })
})
