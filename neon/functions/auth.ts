import { queryRows } from "../../packages/backend/src/database.js"
import { getAuth } from "../../packages/backend/src/auth/index.js"
import { hasWorkspaceMembership } from "../../packages/backend/src/auth/invitations.js"
import { isAuthPath, isAuthMethodAllowed, isGoogleSignInBody } from "../../packages/backend/src/auth/routes.js"
import { verifyInternalAuthRequest } from "../../packages/backend/src/auth/internal-request.js"

type NonceRow = { nonce: string }
type AuthFunctionOptions = {
  secret: string
  trustedOrigins: readonly string[]
  now?: () => number
  claimNonce?: (nonce: string, expiresAt: Date) => Promise<boolean>
  hasMembership?: (userId: string) => Promise<boolean>
  handleAuth?: (request: Request) => Promise<Response>
}

async function claimNonce(nonce: string, expiresAt: Date): Promise<boolean> {
  const rows = await queryRows<NonceRow>(
    `WITH expired AS (
       DELETE FROM moc_auth.internal_request_nonce WHERE expires_at < now()
     )
     INSERT INTO moc_auth.internal_request_nonce (nonce, expires_at)
     VALUES ($1, $2) ON CONFLICT (nonce) DO NOTHING RETURNING nonce`,
    [nonce, expiresAt],
  )
  return rows.length === 1
}

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

async function handleConfiguredAuth(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === "/api/auth/sign-in/social"
    && (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)) {
    return Response.json({ code: "GOOGLE_UNAVAILABLE", message: "Google sign-in is not configured." }, { status: 503 })
  }
  return getAuth().handler(request)
}

async function admittedSession(response: Response, hasMembership: (userId: string) => Promise<boolean>): Promise<Response> {
  if (!response.ok) return response
  const result: unknown = await response.clone().json()
  if (!result || typeof result !== "object" || !("user" in result) || !result.user) return response
  const user = result.user
  if (typeof user === "object" && "id" in user && typeof user.id === "string" && await hasMembership(user.id)) return response
  // The API also resolves sessions through this endpoint, so old pending
  // accounts and removed members cannot use an otherwise valid session cookie.
  return Response.json(null, { headers: { "Cache-Control": "no-store" } })
}

export function createAuthFunctionHandler(options: AuthFunctionOptions) {
  const trustedOrigins = new Set(options.trustedOrigins.map((origin) => new URL(origin).origin))
  const now = options.now ?? Date.now
  const acceptNonce = options.claimNonce ?? claimNonce
  const handleAuth = options.handleAuth ?? handleConfiguredAuth
  const hasMembership = options.hasMembership ?? hasWorkspaceMembership

  return async function handleInternalAuth(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (!isAuthPath(url.pathname)) return Response.json({ error: "Not found" }, { status: 404 })
    if (!isAuthMethodAllowed(url.pathname, request.method)) return Response.json({ error: "Method not allowed" }, { status: 405 })

    const body = request.method === "POST" ? await request.text() : ""
    const cookie = request.headers.get("cookie") ?? ""
    const verified = verifyInternalAuthRequest(
      { method: request.method, path: `${url.pathname}${url.search}`, body, origin: "", cookie, timestamp: 0, nonce: "" },
      request.headers,
      options.secret,
      now(),
    )
    if (!verified || !trustedOrigins.has(verified.origin)) return unauthorized()
    if (!await acceptNonce(verified.nonce, verified.expiresAt)) return Response.json({ error: "Request replayed" }, { status: 409 })

    if (url.pathname === "/api/auth/sign-in/social" && !isGoogleSignInBody(body)) {
      return Response.json({ code: "INVALID_SIGN_IN", message: "Use Google sign-in." }, { status: 400 })
    }

    const headers = new Headers()
    for (const name of ["content-type", "cookie"]) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }
    headers.set("origin", verified.origin)
    const authUrl = new URL(`${url.pathname}${url.search}`, process.env.MOC_AUTH_PUBLIC_BASE_URL ?? verified.origin)
    const authRequest = new Request(authUrl, {
      method: request.method,
      headers,
      ...(request.method === "POST" ? { body } : {}),
      redirect: "manual",
    })
    const response = await handleAuth(authRequest)
    return url.pathname === "/api/auth/get-session" ? admittedSession(response, hasMembership) : response
  }
}

const serviceSecret = process.env.MOC_AUTH_SERVICE_SECRET
const allowedOrigins = (process.env.MOC_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)

export default async function handler(request: Request): Promise<Response> {
  if (!serviceSecret || allowedOrigins.length === 0) return Response.json({ error: "Auth service is not configured" }, { status: 503 })
  return createAuthFunctionHandler({ secret: serviceSecret, trustedOrigins: allowedOrigins })(request)
}
