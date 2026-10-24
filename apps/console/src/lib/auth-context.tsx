import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { MoCSession, MoCUser } from "@moc/sdk/auth"
import type { User as Profile } from "@moc/types/requests/assignee"
import { routes } from "@/screens/console-routes"
import { clearCurrentWorkspaceCache } from "@/data/current-workspace"
import { moc } from "@/lib/moc-client"
import { authCallbackError } from "@moc/sdk/auth"

type AuthState = {
  session: MoCSession | null
  user: MoCUser | null
  profile: Profile | null
  callbackError: string | null
  loading: boolean
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const AUTH_CHANNEL = "moc-auth-session"


function cleanAuthCallbackUrl(): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.searchParams.delete("error")
  url.searchParams.delete("error_description")
  url.hash = ""
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
}

async function fetchProfile(): Promise<Profile | null> {
  return moc.users.getProfile()
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
  const [callbackError, setCallbackError] = useState<string | null>(() => typeof window === "undefined" ? null : authCallbackError(new URL(window.location.href)))
  const [loading, setLoading] = useState(true)
  const sessionUserIdRef = useRef<string | null>(null)
  const sessionRequestRef = useRef(0)
  const signingOutRef = useRef(false)
  const userId = user?.id ?? null

  const refreshSession = useCallback(async () => {
    if (signingOutRef.current) return
    const request = ++sessionRequestRef.current
    try {
      const nextSession = await moc.auth.getSession()
      if (request !== sessionRequestRef.current) return
      const nextUserId = nextSession?.user.id ?? null
      if (nextUserId !== sessionUserIdRef.current) {
        clearCurrentWorkspaceCache()
        setProfile(null)
      }
      sessionUserIdRef.current = nextUserId
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextSession?.user) setProfile(null)
    } catch (error) {
      if (request !== sessionRequestRef.current) return
      if (import.meta.env.DEV) console.error("Failed to restore authentication session:", error)
      sessionUserIdRef.current = null
      clearCurrentWorkspaceCache()
      setSession(null)
      setUser(null)
      setProfile(null)
    } finally {
      if (request === sessionRequestRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const initialize = async () => {
      const callbackFailure = authCallbackError(new URL(window.location.href))
      if (callbackFailure) {
        setCallbackError(callbackFailure)
        cleanAuthCallbackUrl()
      }
      await refreshSession()
      if (!active) return
    }
    void initialize()

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(AUTH_CHANNEL)
    if (channel) channel.onmessage = () => { void refreshSession() }
    const refreshOnFocus = () => { void refreshSession() }
    window.addEventListener("focus", refreshOnFocus)

    return () => {
      active = false
      sessionRequestRef.current += 1
      channel?.close()
      window.removeEventListener("focus", refreshOnFocus)
    }
  }, [refreshSession])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      const nextProfile = await fetchProfile()
      if (sessionUserIdRef.current === userId) setProfile(nextProfile)
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to fetch user profile:", error)
    }
  }, [userId])

  useEffect(() => {
    if (!user) return
    const requestedUserId = user.id
    let active = true
    fetchProfile().then((nextProfile) => {
      if (active && sessionUserIdRef.current === requestedUserId) setProfile(nextProfile)
    }).catch((error: unknown) => {
      if (active && import.meta.env.DEV) console.error("Failed to fetch user profile:", error)
    })
    return () => { active = false }
  }, [user])

  async function signInWithGoogle() {
    const callbackURL = new URL(`/${routes.overview}`, window.location.origin).toString()
    const errorCallbackURL = new URL(`/${routes.login}`, window.location.origin).toString()
    const result = await moc.auth.signInWithGoogle(callbackURL, errorCallbackURL)
    if (result.error) return { error: result.error }
    if (!result.url) return { error: new Error("Google sign-in did not return an authorization URL") }
    window.location.assign(result.url)
    return { error: null }
  }

  async function signOut() {
    signingOutRef.current = true
    sessionRequestRef.current += 1
    let error: Error | null = null
    try {
      const result = await moc.auth.signOut()
      error = result.error
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("Sign-out failed")
    }
    clearCurrentWorkspaceCache()
    sessionUserIdRef.current = null
    setSession(null)
    setUser(null)
    setProfile(null)
    setLoading(false)
    signingOutRef.current = false
    notifyOtherTabs()
    return { error }
  }

  return (
    <AuthContext value={{ session, user, profile, callbackError, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
