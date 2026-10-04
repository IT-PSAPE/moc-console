import { describe, expect, it } from "vitest"
import { createAuthProxyHandler } from "../../../../apps/api/server/auth-proxy.js"

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

    await handler({ method: "POST", url: "/api/auth/sign-in/email", headers: { origin: "https://attacker.test" }, body: {} }, response)

    expect(dispatched).toBe(false)
    expect(response.statusCode).toBe(403)
  })
})
