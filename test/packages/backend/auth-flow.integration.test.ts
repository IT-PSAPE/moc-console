import { describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"
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
      MOC_CONSOLE_ORIGIN: baseUrl,
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
      expect(smtp.messages[0]).toContain('Content-Type: multipart/alternative;')
      expect(smtp.messages[0]).toContain('Content-Type: text/html;')
      expect(smtp.messages[0]).toContain('Content-Type: text/plain;')
      const blockedSignin = await callApi("POST", "/api/auth/sign-in/email", { email: testEmail, password: "old-password-123" })
      expect(blockedSignin.statusCode).toBeGreaterThanOrEqual(400)
      expect((JSON.parse(blockedSignin.body) as { code?: string }).code).toBe("EMAIL_NOT_VERIFIED")
      const resend = await callApi("POST", "/api/auth/send-verification-email", { email: testEmail, callbackURL: `${baseUrl}/login?auth=verified` })
      expect(resend.statusCode).toBe(200)
      expect(smtp.messages).toHaveLength(2)
      const verificationLink = extractEmailLink(smtp.messages[1] ?? "")
      expect(verificationLink.origin).toBe(baseUrl)
      expect(verificationLink.pathname).toBe('/api/auth/verify-email')
      const invalidVerification = new URL(verificationLink)
      invalidVerification.searchParams.set('token', 'invalid-token')
      const rejected = await callApi('GET', `${invalidVerification.pathname}${invalidVerification.search}`, undefined, undefined, false)
      expect([302, 303]).toContain(rejected.statusCode)
      expect(new URL(String(rejected.headers.get('location'))).searchParams.get('error')).toBe('INVALID_TOKEN')
      const expiredPayload = Buffer.from(JSON.stringify({ email: testEmail, exp: Math.floor(Date.now() / 1000) - 3600 })).toString('base64url')
      const expiredData = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${expiredPayload}`
      const expiredSignature = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '').update(expiredData).digest('base64url')
      invalidVerification.searchParams.set('token', `${expiredData}.${expiredSignature}`)
      const expiredVerification = await callApi('GET', `${invalidVerification.pathname}${invalidVerification.search}`, undefined, undefined, false)
      expect(new URL(String(expiredVerification.headers.get('location'))).searchParams.get('error')).toBe('TOKEN_EXPIRED')
      const verified = await callApi("GET", `${verificationLink.pathname}${verificationLink.search}`, undefined, undefined, false)
      expect([302, 303]).toContain(verified.statusCode)
      expect(verified.headers.get('location')).toBe(`${baseUrl}/login?auth=verified`)
      expect(String(verified.headers.get('set-cookie'))).toContain('session_token=')

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
      expect(resetLink.origin).toBe(baseUrl)
      expect(resetLink.pathname).toMatch(/^\/api\/auth\/reset-password\//)
      const resetLinkResponse = await callApi("GET", `${resetLink.pathname}${resetLink.search}`, undefined, undefined, false)
      expect([302, 303]).toContain(resetLinkResponse.statusCode)
      const callbackUrl = new URL(String(resetLinkResponse.headers.get("location") ?? ""), baseUrl)
      const token = callbackUrl.searchParams.get("token")
      expect(token).toBeTruthy()
      const reset = await callApi("POST", "/api/auth/reset-password", { token, newPassword: "new-password-456" })
      expect(reset.statusCode).toBe(200)
      const reused = await callApi('POST', '/api/auth/reset-password', { token, newPassword: 'another-password-789' })
      expect(reused.statusCode).toBe(400)
      const relogin = await callApi("POST", "/api/auth/sign-in/email", { email: testEmail, password: "new-password-456" })
      expect(relogin.statusCode).toBe(200)
      const logoutCookie = relogin.headers.get("set-cookie")
      const logoutSession = (Array.isArray(logoutCookie) ? logoutCookie : [logoutCookie ?? ""]).find((value) => value.includes("session_token="))?.split(";", 1)[0]
      const logout = await callApi("POST", "/api/auth/sign-out", {}, logoutSession)
      expect(logout.statusCode).toBe(200)
      expect(String(logout.headers.get("set-cookie"))).toContain("Max-Age=0")
      const staleSession = await callApi("GET", "/api/auth/get-session", undefined, logoutSession)
      expect(JSON.parse(staleSession.body || "null")).toBeNull()
      await callApi('POST', '/api/auth/request-password-reset', { email: testEmail, redirectTo: `${baseUrl}/password-recovery` })
      const expiredResetLink = extractEmailLink(smtp.messages.at(-1) ?? '')
      const expiredResetToken = expiredResetLink.pathname.split('/').at(-1)
      await pool.query("UPDATE moc_auth.verification SET expires_at = now() - interval '1 minute' WHERE identifier = $1", [`reset-password:${expiredResetToken}`])
      const expiredReset = await callApi('GET', `${expiredResetLink.pathname}${expiredResetLink.search}`, undefined, undefined, false)
      const expiredCallback = new URL(String(expiredReset.headers.get('location')))
      expect(expiredCallback.pathname).toBe('/password-recovery')
      expect(expiredCallback.searchParams.get('error')).toBe('INVALID_TOKEN')
    } finally {
      await pool.query("DELETE FROM moc_auth.\"user\" WHERE email = $1", [testEmail]).catch(() => undefined)
      await Promise.all([pool.end(), new Promise<void>((resolve) => smtp.server.close(() => resolve()))])
      for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
      Object.assign(process.env, originalEnv)
    }
  }, 20_000)
})
