import { getSupabaseAdmin } from "./supabase-admin.js"

const SESSION_HEADER = "x-moc-session"

export type AuthenticatedUser = {
  userId: string
  email: string | null
}

function extractToken(headers: Record<string, string | undefined>): string | null {
  const raw = headers[SESSION_HEADER] ?? headers[SESSION_HEADER.toUpperCase()]
  if (!raw) return null
  return raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : raw.trim()
}

export async function requireAuthenticatedUser(
  headers: Record<string, string | undefined> | undefined,
): Promise<AuthenticatedUser> {
  const token = extractToken(headers ?? {})
  if (!token) {
    throw new AuthError("Missing session token")
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    throw new AuthError("Invalid session")
  }

  return { userId: data.user.id, email: data.user.email ?? null }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}
