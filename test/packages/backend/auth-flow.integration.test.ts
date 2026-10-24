import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import type { ApiRequest, ApiResponse } from "../../../apps/api/server/http.js"
import { createAuthProxyHandler } from "../../../apps/api/server/auth-proxy.js"
import { createAuthFunctionHandler } from "../../../neon/functions/auth.js"
import {
  createAuthTestWorkspace,
  createGoogleOAuthMock,
  createInvitation,
  createExistingMember,
  removeAuthTestData,
  type GoogleIdentity,
} from "./auth-flow-fixture.js"

const databaseUrl = process.env.MOC_AUTH_TEST_DATABASE_URL
const neonTestBranch = "dev-invite-auth-20261024"
const expectedDatabaseHost = "ep-snowy-rice-b1x8j3vl"
const baseUrl = "http://localhost:5199"
const clientId = "auth-flow-test-client.apps.googleusercontent.com"
const serviceSecret = "local-auth-flow-test-secret-with-sufficient-entropy"
const authSecret = "local-auth-flow-test-secret-with-sufficient-entropy"
const hasDatabase = Boolean(databaseUrl)

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

function header(reply: ApiReply, name: string): string | undefined {
  const value = reply.headers.get(name.toLowerCase())
  return Array.isArray(value) ? value.join(", ") : value
}

describe("Better Auth Google invitation callback against isolated Neon", { skip: !hasDatabase, timeout: 60_000 }, () => {
  const originalEnv = { ...process.env }
  const emails: string[] = []
  let pool: Pool
  let workspaceId: string
  let google: Awaited<ReturnType<typeof createGoogleOAuthMock>>
  let authFunction: ReturnType<typeof createAuthFunctionHandler>
  let proxy: ReturnType<typeof createAuthProxyHandler>

  function newEmail(label: string): string {
    const email = `auth-flow-${label}-${randomUUID()}@example.test`
    emails.push(email)
    return email
  }

  async function callApi(method: string, path: string, body?: unknown, cookie?: string): Promise<ApiReply> {
    const response = createApiReply()
    const headers: Record<string, string> = { "content-type": "application/json", origin: baseUrl }
    if (cookie) headers.cookie = cookie
    const request: ApiRequest = { method, url: path, headers, ...(body === undefined ? {} : { body }) }
    await proxy(request, response)
    return response
  }

  async function beginGoogleLogin(code: string, identity: GoogleIdentity): Promise<{ callback: ApiReply; cookie: string }> {
    await google.addIdentity(code, identity)
    const callbackURL = `${baseUrl}/login?auth=success`
    const started = await callApi("POST", "/api/auth/sign-in/social", {
      provider: "google",
      callbackURL,
      errorCallbackURL: `${baseUrl}/login?auth=failed`,
    })
    expect(started.statusCode).toBe(200)
    const authorizationUrl = header(started, "location")
    expect(authorizationUrl).toBeTruthy()
    if (!authorizationUrl) throw new Error("Google authorization redirect was not returned")
    const authorization = new URL(authorizationUrl)
    expect(authorization.origin).toBe("https://accounts.google.com")
    expect(authorization.searchParams.get("redirect_uri")).toBe(`${baseUrl}/api/auth/callback/google`)
    const state = authorization.searchParams.get("state")
    expect(state).toBeTruthy()
    const setCookie = header(started, "set-cookie")
    expect(setCookie).toBeTruthy()
    if (!setCookie || !state) throw new Error("OAuth state cookie was not returned")
    const cookie = setCookie.split(/,(?=[^;]+=[^;]+)/).map((value) => value.trim().split(";", 1)[0]).join("; ")
    const callback = await callApi("GET", `/api/auth/callback/google?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, undefined, cookie)
    return { callback, cookie }
  }

  async function assertNoIdentity(email: string): Promise<void> {
    const result = await pool.query<{ auth_count: string; account_count: string; profile_count: string; request_count: string }>(
      `SELECT
         (SELECT count(*) FROM moc_auth."user" WHERE lower(email) = lower($1)) AS auth_count,
         (SELECT count(*) FROM moc_auth.account WHERE lower((SELECT email FROM moc_auth."user" WHERE id = account.user_id)) = lower($1)) AS account_count,
         (SELECT count(*) FROM public.users WHERE lower(email) = lower($1)) AS profile_count,
         (SELECT count(*) FROM public.workspace_join_requests request JOIN public.users user_row ON user_row.id = request.user_id WHERE lower(user_row.email) = lower($1)) AS request_count`,
      [email],
    )
    expect(result.rows[0]).toEqual({ auth_count: "0", account_count: "0", profile_count: "0", request_count: "0" })
  }

  beforeAll(async () => {
    if (!databaseUrl) return
    let databaseHost = ""
    try { databaseHost = new URL(databaseUrl).hostname } catch { throw new Error("MOC_AUTH_TEST_DATABASE_URL must identify the isolated invite-auth branch") }
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"])
    const isMarkedLocalTestDatabase = process.env.MOC_AUTH_TEST_BRANCH === "local" && localHosts.has(databaseHost)
    const isMarkedNeonTestDatabase = process.env.MOC_AUTH_TEST_BRANCH === neonTestBranch
      && databaseHost.startsWith(`${expectedDatabaseHost}.`) && databaseHost.endsWith(".neon.tech")
    if (!isMarkedLocalTestDatabase && !isMarkedNeonTestDatabase) {
      throw new Error("MOC_AUTH_TEST_DATABASE_URL and MOC_AUTH_TEST_BRANCH must identify the isolated local or invite-auth Neon test branch")
    }
    Object.assign(process.env, {
      DATABASE_URL: databaseUrl,
      NEON_AUTH_DATABASE_URL: databaseUrl,
      MOC_AUTH_PUBLIC_BASE_URL: baseUrl,
      MOC_CONSOLE_ORIGIN: baseUrl,
      MOC_AUTH_TRUSTED_ORIGINS: baseUrl,
      MOC_AUTH_SERVICE_SECRET: serviceSecret,
      BETTER_AUTH_SECRET: authSecret,
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: "auth-flow-test-client-secret",
      NODE_ENV: "test",
    })
    pool = new Pool({ connectionString: databaseUrl })
    workspaceId = await createAuthTestWorkspace(pool, `auth-flow-${randomUUID()}`)
    google = await createGoogleOAuthMock(clientId)
    authFunction = createAuthFunctionHandler({ secret: serviceSecret, trustedOrigins: [baseUrl] })
    proxy = createAuthProxyHandler({
      functionUrl: "https://auth.test",
      secret: serviceSecret,
      trustedOrigins: [baseUrl],
      canonicalOrigin: baseUrl,
      fetch: async (input, init) => authFunction(new Request(String(input), init)),
    })
  }, 30_000)

  afterAll(async () => {
    if (pool) {
      await removeAuthTestData(pool, workspaceId, emails).catch(() => undefined)
      await pool.end()
    }
    google?.restore()
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
    Object.assign(process.env, originalEnv)
  })

  it("accepts an exact verified invite, captures Google names, and creates viewer membership", async () => {
    const email = newEmail("accepted")
    await createInvitation(pool, workspaceId, email)
    const { callback } = await beginGoogleLogin("invite-code", {
      email: email.toUpperCase(),
      subject: `google-${randomUUID()}`,
      givenName: "Invited",
      familyName: "Person",
      name: "Invited Person",
    })

    expect([302, 303]).toContain(callback.statusCode)
    expect(header(callback, "location")).toBe(`${baseUrl}/login?auth=success`)
    expect(header(callback, "set-cookie")).toContain("session_token=")
    const persisted = await pool.query<{ auth_name: string; auth_surname: string; profile_name: string; profile_surname: string; role: string; accepted: boolean }>(
      `SELECT auth_user.name AS auth_name, auth_user.surname AS auth_surname,
         profile.name AS profile_name, profile.surname AS profile_surname,
         role.name AS role, invitation.accepted_at IS NOT NULL AS accepted
       FROM moc_auth."user" auth_user
       JOIN public.users profile ON profile.id = auth_user.id
       JOIN public.workspace_users membership ON membership.user_id = auth_user.id AND membership.workspace_id = $2::uuid
       JOIN public.roles role ON role.id = membership.role_id
       JOIN public.workspace_invitations invitation ON invitation.workspace_id = membership.workspace_id
         AND invitation.normalized_email = lower(auth_user.email)
       WHERE lower(auth_user.email) = lower($1)`,
      [email.toUpperCase(), workspaceId],
    )
    expect(persisted.rows).toEqual([{ auth_name: "Invited", auth_surname: "Person", profile_name: "Invited", profile_surname: "Person", role: "viewer", accepted: true }])
    const pending = await pool.query("SELECT 1 FROM public.workspace_join_requests request JOIN public.users user_row ON user_row.id = request.user_id WHERE lower(user_row.email) = lower($1)", [email])
    expect(pending.rows).toHaveLength(0)
  })

  it("rejects uninvited, unverified, expired, and revoked identities before creating records", async () => {
    const cases: Array<{ label: string; invite?: "valid" | "expired" | "revoked"; verified?: boolean }> = [
      { label: "uninvited" },
      { label: "unverified", invite: "valid", verified: false },
      { label: "expired", invite: "expired" },
      { label: "revoked", invite: "revoked" },
    ]
    for (const scenario of cases) {
      const email = newEmail(scenario.label)
      if (scenario.invite) await createInvitation(pool, workspaceId, email, scenario.invite)
      const { callback } = await beginGoogleLogin(`code-${scenario.label}`, {
        email,
        subject: `google-${randomUUID()}`,
        verified: scenario.verified ?? true,
      })
      expect([302, 303]).toContain(callback.statusCode)
      expect(header(callback, "location")).toMatch(/auth=failed|error=/)
      await assertNoIdentity(email)
    }
  })

  it("links Google to an existing verified member without changing their ID, role, or edited names", async () => {
    const email = newEmail("legacy-member")
    const userId = await createExistingMember(pool, workspaceId, email, "admin")
    const { callback } = await beginGoogleLogin("legacy-link-code", {
      email,
      subject: `google-${randomUUID()}`,
      givenName: "Provider First",
      familyName: "Provider Last",
      name: "Provider First Provider Last",
    })

    expect([302, 303]).toContain(callback.statusCode)
    const persisted = await pool.query<{ id: string; auth_name: string; auth_surname: string; profile_name: string; profile_surname: string; role: string; account_count: string }>(
      `SELECT auth_user.id, auth_user.name AS auth_name, auth_user.surname AS auth_surname,
         profile.name AS profile_name, profile.surname AS profile_surname, role.name AS role,
         (SELECT count(*) FROM moc_auth.account account WHERE account.user_id = auth_user.id AND account.provider_id = 'google') AS account_count
       FROM moc_auth."user" auth_user
       JOIN public.users profile ON profile.id = auth_user.id
       JOIN public.workspace_users membership ON membership.user_id = auth_user.id AND membership.workspace_id = $2::uuid
       JOIN public.roles role ON role.id = membership.role_id WHERE auth_user.email = $1`,
      [email, workspaceId],
    )
    expect(persisted.rows).toEqual([{ id: userId, auth_name: "Edited First", auth_surname: "Edited Surname", profile_name: "Edited First", profile_surname: "Edited Surname", role: "admin", account_count: "1" }])
    const pending = await pool.query("SELECT 1 FROM public.workspace_join_requests WHERE user_id = $1::uuid", [userId])
    expect(pending.rows).toHaveLength(0)
  })

  it.each([
    ["wrong audience", { audience: "another-client.apps.googleusercontent.com" }],
    ["wrong signature", { signature: "invalid" }],
    ["wrong issuer", { issuer: "https://accounts.google.invalid" }],
  ] as const)("rejects Google ID tokens with %s before account creation", async (_label, override) => {
    const email = newEmail("invalid-token")
    await createInvitation(pool, workspaceId, email)
    const { callback } = await beginGoogleLogin(`invalid-${randomUUID()}`, {
      email,
      subject: `google-${randomUUID()}`,
      ...override,
    })
    expect([302, 303]).toContain(callback.statusCode)
    expect(header(callback, "location")).toMatch(/auth=failed|error=/)
    await assertNoIdentity(email)
  })

  it("blocks email/password routes and hides a previously issued session after membership removal", async () => {
    const legacyPaths = ["/api/auth/sign-up/email", "/api/auth/sign-in/email", "/api/auth/request-password-reset"]
    for (const path of legacyPaths) {
      const response = await callApi("POST", path, { email: newEmail("legacy-route"), password: "no-password" })
      expect(response.statusCode).toBe(404)
    }

    const email = newEmail("session-revoked")
    await createInvitation(pool, workspaceId, email)
    const { callback } = await beginGoogleLogin("session-revocation-code", {
      email,
      subject: `google-${randomUUID()}`,
    })
    const sessionCookie = (header(callback, "set-cookie") ?? "").split(/,(?=[^;]+=[^;]+)/)
      .map((value) => value.trim().split(";", 1)[0])
      .find((value) => value.includes("session_token="))
    expect(sessionCookie).toBeTruthy()
    const sessionBeforeRemoval = await callApi("GET", "/api/auth/get-session", undefined, sessionCookie)
    expect(sessionBeforeRemoval.statusCode).toBe(200)
    expect(JSON.parse(sessionBeforeRemoval.body)).toHaveProperty("user.email", email)
    await pool.query("DELETE FROM public.workspace_users WHERE workspace_id = $1::uuid AND user_id = (SELECT id FROM moc_auth.\"user\" WHERE email = $2)", [workspaceId, email])
    const sessionAfterRemoval = await callApi("GET", "/api/auth/get-session", undefined, sessionCookie)
    expect(sessionAfterRemoval.statusCode).toBe(200)
    expect(JSON.parse(sessionAfterRemoval.body)).toBeNull()
  })
})
