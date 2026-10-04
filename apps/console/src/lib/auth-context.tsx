import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { MoCSession, MoCUser } from "@moc/sdk/auth"
import type { User as Profile } from "@moc/types/requests/assignee"
import { routes } from "@/screens/console-routes"
import { clearCurrentWorkspaceCache } from "@/data/current-workspace"
import { moc } from "@/lib/moc-client"
import { authCallbackError, authCallbackOutcome } from "@moc/sdk/auth"

type AuthState = {
  session: MoCSession | null
  user: MoCUser | null
  profile: Profile | null
  isPasswordRecovery: boolean
  callbackError: string | null
  loading: boolean
  signUp: (email: string, password: string, name: string, surname: string, workspaceSlug?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  resendVerification: (email: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const AUTH_CHANNEL = "moc-auth-session"


function passwordResetToken(): string | null {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get("token")
}

function cleanAuthCallbackUrl(outcome: ReturnType<typeof authCallbackOutcome>): void {
  if (typeof window === "undefined" || outcome === null) return
  const url = new URL(window.location.href)
  url.searchParams.delete("auth")
  url.searchParams.delete("error")
  url.searchParams.delete("error_description")
  url.hash = ""
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
}

function callbackOutcome(): ReturnType<typeof authCallbackOutcome> {
  if (typeof window === "undefined") return null
  return authCallbackOutcome(new URL(window.location.href))
}

function currentRecoveryToken(): string | null {
  return passwordResetToken()
}

async function fetchProfile(): Promise<Profile | null> {
  return moc.users.getProfile()
}

function recoveryRedirectUrl(): string {
  return new URL(`/${routes.passwordRecovery}`, window.location.origin).toString()
}

function signupCallbackUrl(): string {
  const url = new URL(`/${routes.login}`, window.location.origin)
  url.searchParams.set("auth", "verified")
  return url.toString()
}

function notifyOtherTabs(): void {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(AUTH_CHANNEL)
  channel.postMessage({ type: "session-changed" })
  channel.close()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MoCSession | null>(null)
  const [user, setUser] = useState<MoCUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [callbackError] = useState<string | null>(() => typeof window === "undefined"
    ? null
    : authCallbackError(new URL(window.location.href)))
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const nextSession = await moc.auth.getSession()
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      clearCurrentWorkspaceCache()
      if (!nextSession?.user) setProfile(null)
      setIsPasswordRecovery(callbackOutcome() === "password-recovery")
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to restore authentication session:", error)
      setSession(null)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const initialize = async () => {
      const outcome = callbackOutcome()
      if (authCallbackError(new URL(window.location.href))) {
        const url = new URL(window.location.href)
        url.searchParams.delete("error")
        url.searchParams.delete("error_description")
        url.hash = ""
        window.history.replaceState({}, "", `${url.pathname}${url.search}`)
      }
      await refreshSession()
      if (!active) return
      if (outcome === "password-recovery") setIsPasswordRecovery(true)
      if (outcome === "verified") cleanAuthCallbackUrl(outcome)
    }
    void initialize()

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(AUTH_CHANNEL)
    if (channel) channel.onmessage = () => { void refreshSession() }
    const refreshOnFocus = () => { void refreshSession() }
    window.addEventListener("focus", refreshOnFocus)

    return () => {
      active = false
      channel?.close()
      window.removeEventListener("focus", refreshOnFocus)
    }
  }, [refreshSession])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      setProfile(await fetchProfile())
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to fetch user profile:", error)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    fetchProfile().then((nextProfile) => {
      if (active) setProfile(nextProfile)
    }).catch((error: unknown) => {
      if (active && import.meta.env.DEV) console.error("Failed to fetch user profile:", error)
    })
    return () => { active = false }
  }, [user])

  async function signUp(email: string, password: string, name: string, surname: string, workspaceSlug?: string) {
    const result = await moc.auth.signUp({ email, password, name, surname, workspaceSlug, callbackURL: signupCallbackUrl() })
    return { error: result.error }
  }

  async function signIn(email: string, password: string) {
    const result = await moc.auth.signIn(email, password)
    if (!result.error) {
      await refreshSession()
      notifyOtherTabs()
    }
    return { error: result.error }
  }

  async function signOut() {
    let error: Error | null = null
    try {
      const result = await moc.auth.signOut()
      error = result.error
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("Sign-out failed")
    }
    clearCurrentWorkspaceCache()
    setSession(null)
    setUser(null)
    setProfile(null)
    setIsPasswordRecovery(false)
    notifyOtherTabs()
    return { error }
  }

  async function resetPassword(email: string) {
    const result = await moc.auth.requestPasswordReset(email, recoveryRedirectUrl())
    return { error: result.error }
  }

  async function updatePassword(password: string) {
    const token = currentRecoveryToken()
    if (!token) return { error: new Error("This password recovery link is missing or has expired") }
    const result = await moc.auth.resetPassword(token, password)
    if (!result.error) {
      setIsPasswordRecovery(false)
      const url = new URL(window.location.href)
      url.searchParams.delete("token")
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    }
    return { error: result.error }
  }

  async function resendVerification(email: string) {
    const result = await moc.auth.sendVerificationEmail(email, signupCallbackUrl())
    return { error: result.error }
  }

  return (
    <AuthContext value={{ session, user, profile, isPasswordRecovery, callbackError, loading, signUp, signIn, signOut, resetPassword, updatePassword, resendVerification, refreshProfile }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
