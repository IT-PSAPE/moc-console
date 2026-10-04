import { describe, expect, it } from "vitest"
import { Pool } from "pg"
import type { ApiRequest, ApiResponse } from "../../../apps/api/server/http.js"
import { createAuthProxyHandler } from "../../../apps/api/server/auth-proxy.js"
import { createAuthFunctionHandler } from "../../../neon/functions/auth.js"
import { createFakeSmtpServer, extractEmailLink, seedAuthTestSchema } from "./auth-flow-fixture.js"

const databaseUrl = process.env.MOC_AUTH_TEST_DATABASE_URL
const testEmail = `auth-flow-${crypto.randomUUID()}@example.test`
const localDatabaseConfigured = (() => {
  if (!databaseUrl) return false
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)
  } catch {
    return false
  }
})()

type ApiReply = { statusCode: number; headers: Map<string, string | string[]>; body: string }

function createApiReply(): ApiReply & ApiResponse {
  const reply: ApiReply & ApiResponse = {
    statusCode: 200,
    headers: new Map(),
    body: "",
    status(code) { reply.statusCode = code; return reply },
    json(value) { reply.body = JSON.stringify(value) },
    setHeader(name, value) { reply.headers.set(name.toLowerCase(), value) },
    end(value) { reply.body = typeof value === "string" ? value : "" },
  }
  return reply
}

describe("Better Auth PostgreSQL email/password contract", () => {
  it.skipIf(!localDatabaseConfigured)("signs up, verifies, signs in, resets a password, and signs in again", async () => {
    const originalEnv = { ...process.env }
    const pool = new Pool({ connectionString: databaseUrl })
    const smtp = createFakeSmtpServer()
    await new Promise<void>((resolve) => smtp.server.listen(0, "127.0.0.1", resolve))
    const address = smtp.server.address()
    if (!address || typeof address === "string") throw new Error("Fake SMTP server failed to bind")
    const baseUrl = "http://localhost:5199"
    Object.assign(process.env, {
      DATABASE_URL: databaseUrl,
      NEON_AUTH_DATABASE_URL: databaseUrl,
      MOC_AUTH_PUBLIC_BASE_URL: baseUrl,
      MOC_AUTH_TRUSTED_ORIGINS: baseUrl,
      BETTER_AUTH_SECRET: "local-auth-flow-test-secret-with-sufficient-entropy",
      NODE_ENV: "test",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(address.port),
      SMTP_USER: "test",
      SMTP_PASSWORD: "test",
      SMTP_FROM: "auth@example.test",
    })

    try {
      await seedAuthTestSchema(pool)
      const secret = process.env.MOC_AUTH_SERVICE_SECRET ?? "local-auth-flow-test-secret-with-sufficient-entropy"
      const authFunction = createAuthFunctionHandler({ secret, trustedOrigins: [baseUrl] })
      const proxy = createAuthProxyHandler({
        functionUrl: "https://auth.test",
        secret,
        trustedOrigins: [baseUrl],
        canonicalOrigin: baseUrl,
        fetch: async (input, init) => authFunction(new Request(String(input), init)),
      })
      async function callApi(method: string, path: string, body?: unknown, cookie?: string, sendOrigin = true): Promise<ApiReply> {
        const response = createApiReply()
        const headers: Record<string, string> = { "content-type": "application/json" }
        if (sendOrigin) headers.origin = baseUrl
        if (cookie) headers.cookie = cookie
        const request: ApiRequest = { method, url: path, headers, ...(body === undefined ? {} : { body }) }
        await proxy(request, response)
        return response
      }

      const signup = await callApi("POST", "/api/auth/sign-up/email", { email: testEmail, password: "old-password-123", name: "Auth Flow", surname: "Test", workspaceSlug: "default-workspace", callbackURL: `${baseUrl}/login?auth=verified` })
      expect(signup.statusCode).toBe(200)
      expect(smtp.messages).toHaveLength(1)
      const blockedSignin = await callApi("POST", "/api/auth/sign-in/email", { email: testEmail, password: "old-password-123" })
      expect(blockedSignin.statusCode).toBeGreaterThanOrEqual(400)
      expect((JSON.parse(blockedSignin.body) as { code?: string }).code).toBe("EMAIL_NOT_VERIFIED")
      const resend = await callApi("POST", "/api/auth/send-verification-email", { email: testEmail, callbackURL: `${baseUrl}/login?auth=verified` })
      expect(resend.statusCode).toBe(200)
      expect(smtp.messages).toHaveLength(2)
      const verificationLink = extractEmailLink(smtp.messages[1] ?? "")
      const verified = await callApi("GET", `${verificationLink.pathname}${verificationLink.search}`, undefined, undefined, false)
      expect([302, 303]).toContain(verified.statusCode)

      const signin = await callApi("POST", "/api/auth/sign-in/email", { email: testEmail, password: "old-password-123" })
      expect(signin.statusCode).toBe(200)
      const cookieHeader = signin.headers.get("set-cookie")
      const cookie = (Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader ?? ""]).find((value) => value.includes("session_token="))?.split(";", 1)[0]
      expect(cookie).toBeDefined()
      if (!cookie) throw new Error("Better Auth did not issue a session cookie")
      const session = await callApi("GET", "/api/auth/get-session", undefined, cookie)
      expect((JSON.parse(session.body) as { user?: { email?: string } }).user?.email).toBe(testEmail)

      const resetRequest = await callApi("POST", "/api/auth/request-password-reset", { email: testEmail, redirectTo: `${baseUrl}/password-recovery` })
      expect(resetRequest.statusCode).toBe(200)
      const resetLink = extractEmailLink(smtp.messages[2] ?? "")
      const resetLinkResponse = await callApi("GET", `${resetLink.pathname}${resetLink.search}`, undefined, undefined, false)
      expect([302, 303]).toContain(resetLinkResponse.statusCode)
      const callbackUrl = new URL(String(resetLinkResponse.headers.get("location") ?? ""), baseUrl)
      const token = callbackUrl.searchParams.get("token")
      expect(token).toBeTruthy()
      const reset = await callApi("POST", "/api/auth/reset-password", { token, newPassword: "new-password-456" })
      expect(reset.statusCode).toBe(200)
      const relogin = await callApi("POST", "/api/auth/sign-in/email", { email: testEmail, password: "new-password-456" })
      expect(relogin.statusCode).toBe(200)
      const logoutCookie = relogin.headers.get("set-cookie")
      const logoutSession = (Array.isArray(logoutCookie) ? logoutCookie : [logoutCookie ?? ""]).find((value) => value.includes("session_token="))?.split(";", 1)[0]
      const logout = await callApi("POST", "/api/auth/sign-out", {}, logoutSession)
      expect(logout.statusCode).toBe(200)
      expect(String(logout.headers.get("set-cookie"))).toContain("Max-Age=0")
      const staleSession = await callApi("GET", "/api/auth/get-session", undefined, logoutSession)
      expect(JSON.parse(staleSession.body || "null")).toBeNull()
    } finally {
      await pool.query("DELETE FROM moc_auth.\"user\" WHERE email = $1", [testEmail]).catch(() => undefined)
      await Promise.all([pool.end(), new Promise<void>((resolve) => smtp.server.close(() => resolve()))])
      for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
      Object.assign(process.env, originalEnv)
    }
  })
})
