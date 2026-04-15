import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { User as Profile, Role } from "@/types/requests/assignee"
import { routes } from "@/screens/console-routes"
import { clearCurrentWorkspaceCache } from "@/data/current-workspace"
import { supabase } from "./supabase"

type AuthState = {
    session: Session | null
    user: User | null
    profile: Profile | null
    role: Role | null
    isPasswordRecovery: boolean
    loading: boolean
    signUp: (email: string, password: string, name: string, surname: string) => Promise<{ error: Error | null }>
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<{ error: Error | null }>
    resetPassword: (email: string) => Promise<{ error: Error | null }>
    updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthState | null>(null)

function clearSupabaseAuthStorage() {
    if (typeof window === "undefined") {
        return
    }

    const localStorageKeys = Object.keys(window.localStorage).filter((key) => key.startsWith("sb-"))
    const sessionStorageKeys = Object.keys(window.sessionStorage).filter((key) => key.startsWith("sb-"))

    for (const key of localStorageKeys) {
        window.localStorage.removeItem(key)
    }

    for (const key of sessionStorageKeys) {
        window.sessionStorage.removeItem(key)
    }
}

function hasPasswordRecoveryParams() {
    if (typeof window === "undefined") {
        return false
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const searchParams = new URLSearchParams(window.location.search)

    return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery"
}

function getResetPasswordRedirectUrl() {
    if (typeof window === "undefined") {
        return undefined
    }

    return new URL(`/${routes.passwordRecovery}`, window.location.origin).toString()
}

async function exchangeAuthCodeFromUrl() {
    if (typeof window === "undefined") {
        return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const authCode = searchParams.get("code")

    if (!authCode) {
        return
    }

    const { error } = await supabase.auth.exchangeCodeForSession(authCode)

    if (!error) {
        searchParams.delete("code")
        const nextSearch = searchParams.toString()
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
        window.history.replaceState({}, "", nextUrl)
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [role, setRole] = useState<Role | null>(null)
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isActive = true

        async function initializeAuth() {
            await exchangeAuthCodeFromUrl()

            const { data: { session } } = await supabase.auth.getSession()

            if (!isActive) {
                return
            }

            setSession(session)
            setUser(session?.user ?? null)
            setIsPasswordRecovery(hasPasswordRecoveryParams())
            clearCurrentWorkspaceCache()

            if (!session?.user) {
                setProfile(null)
                setRole(null)
            }

            setLoading(false)
        }

        initializeAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            setSession(nextSession)
            setUser(nextSession?.user ?? null)
            clearCurrentWorkspaceCache()

            if (!nextSession?.user) {
                setProfile(null)
                setRole(null)
                setIsPasswordRecovery(false)
                return
            }

            if (event === "PASSWORD_RECOVERY") {
                setIsPasswordRecovery(true)
                return
            }

            if (event === "USER_UPDATED") {
                setIsPasswordRecovery(false)
                return
            }

            if (hasPasswordRecoveryParams()) {
                setIsPasswordRecovery(true)
            }
        })

        return () => {
            isActive = false
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (!user) return

        let isActive = true
        const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""
        const metadataSurname = typeof user.user_metadata?.surname === "string" ? user.user_metadata.surname : ""

        supabase
            .from("users")
            .select("id, name, surname, email, telegram_chat_id")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    console.error("Failed to fetch user profile:", error.message)
                }

                if (data) {
                    if (isActive) {
                        setProfile({
                            id: data.id,
                            email: data.email,
                            name: data.name,
                            surname: data.surname,
                            telegramChatId: data.telegram_chat_id,
                        })
                    }
                    return
                }

                if (isActive) {
                    setProfile(metadataName && metadataSurname && user.email ? {
                        id: user.id,
                        email: user.email,
                        name: metadataName,
                        surname: metadataSurname,
                        telegramChatId: null,
                    } : null)
                }
            })

        supabase
            .from("user_roles")
            .select("roles(id, name, can_create, can_read, can_update, can_delete, can_manage_roles)")
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data, error }) => {

                if (error) {
                    console.error("Failed to fetch user role:", error.message)
                }

                const userRole = Array.isArray(data?.roles) ? data.roles[0] : data?.roles
                if (isActive) {
                    setRole((userRole as Role | null) ?? null)
                }
            })

        return () => {
            isActive = false
        }
    }, [user])

    async function signUp(email: string, password: string, name: string, surname: string) {
        // const { data, error } = await supabase.auth.signUp({
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, surname },
            },
        })

        if (error) {
            return { error: error as Error | null }
        }

        // if (data.session && data.user) {
        //     const profileError = await upsertProfile(data.user.id, email, name, surname)
        //     if (profileError) {
        //         return { error: profileError }
        //     }
        // }

        return { error: null }
    }

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error as Error | null }
    }

    async function signOut() {
        let error: Error | null = null
        try {
            const result = await supabase.auth.signOut({ scope: "local" })
            error = result.error as Error | null
        } catch (e) {
            error = e instanceof Error ? e : new Error("Sign-out failed")
        }
        clearSupabaseAuthStorage()
        clearCurrentWorkspaceCache()
        setSession(null)
        setUser(null)
        setProfile(null)
        setRole(null)
        return { error }
    }

    async function resetPassword(email: string) {
        const redirectTo = getResetPasswordRedirectUrl()
        const { error } = await supabase.auth.resetPasswordForEmail(
            email,
            redirectTo ? { redirectTo } : undefined,
        )
        return { error: error as Error | null }
    }

    async function updatePassword(password: string) {
        const { error } = await supabase.auth.updateUser({ password })

        if (!error) {
            setIsPasswordRecovery(false)
        }

        return { error: error as Error | null }
    }

    return (
        <AuthContext value={{ session, user, profile, role, isPasswordRecovery, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
            {children}
        </AuthContext>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
