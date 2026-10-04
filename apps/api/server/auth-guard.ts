import { createAuthSessionResolver } from "./auth-proxy.js"
import { headerValue } from "./http.js"

export type AuthenticatedUser = {
  userId: string
  email: string | null
}

type AuthSession = {
  session?: { id?: unknown } | null
  user?: { id?: unknown; email?: unknown } | null
}
type SessionResolver = (cookie: string, origin?: string) => Promise<unknown>
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createSessionResolver(options: {
  functionUrl: string
  secret: string
  trustedOrigins: readonly string[]
  canonicalOrigin?: string
  fetch?: typeof fetch
}): SessionResolver {
  return createAuthSessionResolver(options)
}

function sessionResolverFromEnvironment(): SessionResolver {
  const functionUrl = process.env.NEON_AUTH_FUNCTION_URL
  const secret = process.env.MOC_AUTH_SERVICE_SECRET
  const trustedOrigins = (process.env.MOC_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)
  const canonicalOrigin = process.env.MOC_CONSOLE_ORIGIN
  if (!functionUrl || !secret || trustedOrigins.length === 0) throw new AuthError("Authentication service is not configured")
  return createSessionResolver({ functionUrl, secret, trustedOrigins, canonicalOrigin })
}

function cookieValue(headers: Record<string, string | string[] | undefined>): string {
  return headerValue(headers, "cookie") ?? ""
}

export async function requireAuthenticatedUser(headers: Record<string, string | string[] | undefined> | undefined, resolveSession?: SessionResolver): Promise<AuthenticatedUser> {
  const normalizedHeaders = headers ?? {}
  const cookie = cookieValue(normalizedHeaders)
  if (!cookie) throw new AuthError("Missing session cookie")

  let result: unknown
  try {
    const resolver = resolveSession ?? sessionResolverFromEnvironment()
    result = await resolver(cookie, headerValue(normalizedHeaders, "origin") ?? undefined)
  } catch {
    throw new AuthError("Invalid session")
  }

  if (!result || typeof result !== "object") throw new AuthError("Invalid session")
  const session = result as AuthSession
  const user = session.user
  if (!session.session || typeof session.session.id !== "string" || !user
    || typeof user.id !== "string" || !UUID_PATTERN.test(user.id) || typeof user.email !== "string") throw new AuthError("Invalid session")
  return { userId: user.id, email: user.email }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}
