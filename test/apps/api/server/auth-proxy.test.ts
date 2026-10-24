import { describe, expect, it } from "vitest"
import { createAuthProxyHandler } from "../../../../apps/api/server/auth-proxy.js"
import { authRequestPath } from "../../../../apps/api/server/auth-proxy-helpers.js"

function responseRecorder() {
  const headers = new Map<string, string>()
  let statusCode = 200
  let body: unknown
  return {
    headers,
    get statusCode() { return statusCode },
    get body() { return body },
    status(code: number) { statusCode = code; return this },
    json(value: unknown) { body = value },
    setHeader(name: string, value: string | string[]) { headers.set(name.toLowerCase(), Array.isArray(value) ? value.join("\n") : value) },
    end(value?: unknown) { body = typeof value === "string" ? JSON.parse(value) as unknown : value },
  }
}

describe("auth proxy", () => {
  it("resolves nested deployment rewrites without forwarding routing metadata", () => {
    expect(authRequestPath({ url: "/api/auth/_proxy?authPath=sign-in%2Fsocial&path=_proxy", headers: {} }))
      .toEqual({ path: "/api/auth/sign-in/social", query: "" })
    expect(authRequestPath({ url: "/api/auth/[...path]?authPath=callback%2Fgoogle&code=test&state=opaque", headers: {} }))
      .toEqual({ path: "/api/auth/callback/google", query: "?code=test&state=opaque" })
    expect(authRequestPath({ url: "/api/auth/get-session?path=get-session", headers: {} }))
      .toEqual({ path: "/api/auth/get-session", query: "" })
  })

  it("rejects missing, ambiguous and unlisted rewritten auth routes", () => {
    for (const url of [
      "/api/auth/_proxy", "/api/auth/_proxy?authPath=admin/list-users",
      "/api/auth/_proxy?authPath=sign-up/email&authPath=sign-in/email",
      "/api/auth/_proxy?authPath=../admin", "/api/other?authPath=sign-up/email",
    ]) expect(authRequestPath({ url, headers: {} })).toBeNull()
  })

  it("signs a normalized internal request and relays Better Auth cookie set/clear headers", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const handler = createAuthProxyHandler({
      functionUrl: "https://auth.example.test/auth",
      secret: "a-test-secret-that-is-long-enough",
      trustedOrigins: ["https://console.example.test"],
      now: () => 1_800_000_000_000,
      nonce: () => "nonce-1",
      fetch: async (input, init) => {
        calls.push({ url: String(input), init })
        const headers = new Headers({ "content-type": "application/json" })
        headers.append("set-cookie", "better-auth.session_token=opaque; Path=/api; HttpOnly; Secure; SameSite=Lax")
        headers.append("set-cookie", "better-auth.session_token=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0")
        return new Response(JSON.stringify({ user: null }), { status: 200, headers })
      },
    })
    const response = responseRecorder()

    await handler({
      method: "POST",
      url: "/api/auth/sign-out",
      headers: {
        origin: "https://console.example.test",
        cookie: "better-auth.session_token=opaque-session",
        "x-moc-auth-signature": "caller-value",
      },
      body: { ignored: true },
    }, response)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://auth.example.test/auth/api/auth/sign-out")
    const requestHeaders = new Headers(calls[0]?.init?.headers)
    expect(requestHeaders.get("x-moc-auth-signature")).not.toBe("caller-value")
    expect(requestHeaders.get("x-moc-auth-signature")).toMatch(/^[a-f0-9]{64}$/)
    expect(requestHeaders.get("x-moc-auth-nonce")).toBe("nonce-1")
    expect(requestHeaders.get("x-moc-auth-cookie-sha256")).toMatch(/^[a-f0-9]{64}$/)
    expect(response.statusCode).toBe(200)
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=opaque")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    expect(response.body).toEqual({ user: null })
  })

  it("rejects untrusted origins before dispatch", async () => {
    let dispatched = false
    const handler = createAuthProxyHandler({
      functionUrl: "https://auth.example.test/auth",
      secret: "a-test-secret-that-is-long-enough",
      trustedOrigins: ["https://console.example.test"],
      fetch: async () => { dispatched = true; return new Response() },
    })
    const response = responseRecorder()

    await handler({ method: "POST", url: "/api/auth/sign-in/social", headers: { origin: "https://attacker.test" }, body: {} }, response)

    expect(dispatched).toBe(false)
    expect(response.statusCode).toBe(403)
  })
  it("rejects legacy password routes and non-Google or extra sign-in payload fields", async () => {
    let dispatches = 0
    const handler = createAuthProxyHandler({ functionUrl: "https://auth.test", secret: "test-secret", trustedOrigins: ["https://console.test"], fetch: async () => { dispatches += 1; return Response.json({}) } })
    for (const path of ["sign-up/email", "sign-in/email", "request-password-reset", "verify-email", "change-password", "callback/github"]) {
      const response = responseRecorder()
      await handler({ method: "POST", url: `/api/auth/${path}`, headers: { origin: "https://console.test" }, body: {} }, response)
      expect(response.statusCode).toBe(404)
    }
    for (const extra of [{ provider: "github" }, { idToken: { token: "untrusted" } }, { additionalData: { surname: "untrusted" } }]) {
      const response = responseRecorder()
      await handler({ method: "POST", url: "/api/auth/sign-in/social", headers: { origin: "https://console.test" }, body: { provider: "google", callbackURL: "https://console.test/overview", errorCallbackURL: "https://console.test/login", ...extra } }, response)
      expect(response.statusCode).toBe(400)
    }
    expect(dispatches).toBe(0)
  })

})
