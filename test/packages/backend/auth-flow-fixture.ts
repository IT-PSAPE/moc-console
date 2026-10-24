import { exportJWK, generateKeyPair, SignJWT } from "jose"
import type { Pool } from "pg"

export type GoogleIdentity = {
  email: string
  subject: string
  verified?: boolean
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
  audience?: string
  issuer?: string
  signature?: "valid" | "invalid"
}

export async function createGoogleOAuthMock(clientId: string) {
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const invalidPair = await generateKeyPair("RS256")
  const jwk = await exportJWK(publicKey)
  const keyId = "moc-auth-test-key"
  const identities = new Map<string, GoogleIdentity>()
  const originalFetch = globalThis.fetch

  async function signIdentity(identity: GoogleIdentity): Promise<string> {
    return new SignJWT({
      email: identity.email,
      email_verified: identity.verified ?? true,
      name: identity.name ?? "Google Test User",
      ...(identity.givenName ? { given_name: identity.givenName } : {}),
      ...(identity.familyName ? { family_name: identity.familyName } : {}),
      ...(identity.picture ? { picture: identity.picture } : {}),
    })
      .setProtectedHeader({ alg: "RS256", kid: keyId })
      .setIssuer(identity.issuer ?? "https://accounts.google.com")
      .setAudience(identity.audience ?? clientId)
      .setSubject(identity.subject)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(identity.signature === "invalid" ? invalidPair.privateKey : privateKey)
  }

  async function fetchGoogle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url)
    if (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token" && init?.method === "POST") {
      const code = new URLSearchParams(String(init.body ?? "")).get("code")
      const identity = code ? identities.get(code) : undefined
      if (!identity) return Response.json({ error: "invalid_grant" }, { status: 400 })
      return Response.json({ access_token: `access-${code}`, token_type: "Bearer", expires_in: 300, scope: "openid email profile", id_token: await signIdentity(identity) })
    }
    if (url.origin === "https://www.googleapis.com" && url.pathname === "/oauth2/v3/certs") {
      return Response.json({ keys: [{ ...jwk, kid: keyId, use: "sig", alg: "RS256" }] }, { headers: { "cache-control": "public, max-age=300" } })
    }
    throw new Error(`Unexpected network request in Google OAuth test: ${url.origin}${url.pathname}`)
  }

  globalThis.fetch = fetchGoogle
  return {
    async addIdentity(code: string, identity: GoogleIdentity): Promise<void> {
      identities.set(code, identity)
    },
    restore(): void {
      globalThis.fetch = originalFetch
    },
  }
}

export async function createAuthTestWorkspace(pool: Pool, slug: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    "INSERT INTO public.workspaces (name, slug) VALUES ($1, $2) RETURNING id",
    [`Auth flow ${slug}`, slug],
  )
  const workspaceId = result.rows[0]?.id
  if (!workspaceId) throw new Error("Auth test workspace was not created")
  return workspaceId
}

export async function createInvitation(pool: Pool, workspaceId: string, email: string, state: "valid" | "expired" | "revoked" = "valid"): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.workspace_invitations (workspace_id, email, created_at, expires_at, revoked_at)
     VALUES ($1::uuid, $2, CASE WHEN $3 = 'expired' THEN now() - interval '2 days' ELSE now() END,
       CASE WHEN $3 = 'expired' THEN now() - interval '1 day' ELSE now() + interval '7 days' END,
       CASE WHEN $3 = 'revoked' THEN now() ELSE NULL END)
     RETURNING id`,
    [workspaceId, email, state],
  )
  const invitationId = result.rows[0]?.id
  if (!invitationId) throw new Error("Auth test invitation was not created")
  return invitationId
}

export async function createExistingMember(pool: Pool, workspaceId: string, email: string, role: "viewer" | "editor" | "admin"): Promise<string> {
  const authUser = await pool.query<{ id: string }>(
    `INSERT INTO moc_auth."user" (name, surname, email, email_verified)
     VALUES ('Edited First', 'Edited Surname', $1, true) RETURNING id`,
    [email],
  )
  const userId = authUser.rows[0]?.id
  if (!userId) throw new Error("Auth test member was not created")
  await pool.query(
    `INSERT INTO public.users (id, name, surname, email)
     VALUES ($1::uuid, 'Edited First', 'Edited Surname', $2)
     ON CONFLICT (id) DO NOTHING`,
    [userId, email],
  )
  await pool.query(
    `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
     SELECT $1::uuid, $2::uuid, role.id, member_type.id
     FROM public.roles role
     CROSS JOIN LATERAL (SELECT id FROM public.workspace_member_types WHERE workspace_id = $1::uuid AND is_default LIMIT 1) member_type
     WHERE role.name = $3`,
    [workspaceId, userId, role],
  )
  return userId
}

export async function removeAuthTestData(pool: Pool, workspaceId: string, emails: readonly string[]): Promise<void> {
  await pool.query('DELETE FROM moc_auth."user" WHERE email = ANY($1::text[])', [emails])
  await pool.query("DELETE FROM public.workspaces WHERE id = $1::uuid", [workspaceId])
}
