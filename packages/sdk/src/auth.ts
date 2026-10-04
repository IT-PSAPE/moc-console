import type { MocTransport } from "./transport"
export { authCallbackError, authCallbackOutcome, type AuthCallbackOutcome } from "./auth-callback"

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

type BetterAuthUser = Partial<MoCUser> & { id: string; email: string }
type BetterAuthSession = { id: string; userId: string; expiresAt: string }
type SessionEnvelope = { session?: BetterAuthSession | null; user?: BetterAuthUser | null } | null

type SignUpInput = {
  email: string
  password: string
  name: string
  surname: string
  workspaceSlug?: string
  callbackURL: string
}

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

  async function signUp(input: SignUpInput): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/sign-up/email", {
        method: "POST",
        json: {
          email: input.email,
          password: input.password,
          name: input.name,
          surname: input.surname,
          ...(input.workspaceSlug ? { workspaceSlug: input.workspaceSlug } : {}),
          callbackURL: input.callbackURL,
        },
      })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
    }
  }

  async function signIn(email: string, password: string): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/sign-in/email", { method: "POST", json: { email, password } })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
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

  async function requestPasswordReset(email: string, redirectTo: string): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/request-password-reset", { method: "POST", json: { email, redirectTo } })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
    }
  }

  async function sendVerificationEmail(email: string, redirectTo: string): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/send-verification-email", { method: "POST", json: { email, callbackURL: redirectTo } })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
    }
  }

  async function resetPassword(token: string, newPassword: string): Promise<MoCAuthResult> {
    try {
      await transport.request("/api/auth/reset-password", { method: "POST", json: { token, newPassword } })
      return { error: null }
    } catch (error) {
      return { error: asError(error) }
    }
  }

  return { getSession, signUp, signIn, signOut, requestPasswordReset, sendVerificationEmail, resetPassword }
}
