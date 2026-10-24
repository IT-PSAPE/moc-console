import type { MocTransport } from "./transport"
export { authCallbackError } from "./auth-callback"

export type MoCUser = {
  id: string
  email: string
  name: string
  surname: string
  emailVerified: boolean
  image: string | null
}

export type MoCSession = {
  id: string
  userId: string
  expiresAt: string
  user: MoCUser
}

export class MoCAuthError extends Error {
  code?: string
}

export type MoCAuthResult = { error: MoCAuthError | null }
export type GoogleSignInResult = { url: string | null; error: MoCAuthError | null }

type BetterAuthUser = Partial<MoCUser> & { id: string; email: string }
type BetterAuthSession = { id: string; userId: string; expiresAt: string }
type SessionEnvelope = { session?: BetterAuthSession | null; user?: BetterAuthUser | null } | null
type SocialSignInResponse = { url?: unknown } | null

function asUser(user: BetterAuthUser): MoCUser {
  return {
    id: user.id,
    email: user.email,
    name: typeof user.name === "string" ? user.name : "",
    surname: typeof user.surname === "string" ? user.surname : "",
    emailVerified: user.emailVerified === true,
    image: typeof user.image === "string" ? user.image : null,
  }
}

function asError(error: unknown): MoCAuthError {
  const result = new MoCAuthError(error instanceof Error ? error.message : "Authentication request failed")
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") result.code = error.code
  return result
}

export function createAuthClient(transport: MocTransport) {
  async function getSession(): Promise<MoCSession | null> {
    const envelope = await transport.request<SessionEnvelope>("/api/auth/get-session")
    if (!envelope?.session || !envelope.user) return null
    return { ...envelope.session, user: asUser(envelope.user) }
  }

  async function signInWithGoogle(callbackURL: string, errorCallbackURL: string): Promise<GoogleSignInResult> {
    try {
      const response = await transport.request<SocialSignInResponse>("/api/auth/sign-in/social", {
        method: "POST",
        json: { provider: "google", callbackURL, errorCallbackURL, disableRedirect: true },
      })
      return { url: typeof response?.url === "string" ? response.url : null, error: null }
    } catch (error) {
      return { url: null, error: asError(error) }
    }
  }

  async function signOut(): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/sign-out", { method: "POST", json: {} })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
    }
  }

  return { getSession, signInWithGoogle, signOut }
}
