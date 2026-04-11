import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { User as Profile, Role } from "@/types/requests/assignee"
import { supabase } from "./supabase"

type AuthState = {
    session: Session | null
    user: User | null
    profile: Profile | null
    role: Role | null
    loading: boolean
    signUp: (email: string, password: string, name: string, surname: string) => Promise<{ error: Error | null }>
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<{ error: Error | null }>
    resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthState | null>(null)

async function upsertProfile(userId: string, email: string, name: string, surname: string) {
    const { error } = await supabase
        .from("users")
        .upsert({ id: userId, email, name, surname }, { onConflict: "id" })

    return error ? new Error(error.message) : null
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [role, setRole] = useState<Role | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (!session?.user) {
                setProfile(null)
                setRole(null)
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (!session?.user) {
                setProfile(null)
                setRole(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        if (!user) return

        let isActive = true
        const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""
        const metadataSurname = typeof user.user_metadata?.surname === "string" ? user.user_metadata.surname : ""

        supabase
            .from("users")
            .select("id, name, surname, email")
            .eq("id", user.id)
            .maybeSingle()
            .then(async ({ data }) => {
                if (data) {
                    if (isActive) {
                        setProfile(data as Profile | null)
                    }
                    return
                }

                if (!metadataName || !metadataSurname || !user.email) {
                    if (isActive) {
                        setProfile(null)
                    }
                    return
                }

                const error = await upsertProfile(user.id, user.email, metadataName, metadataSurname)
                if (!error && isActive) {
                    setProfile({
                        id: user.id,
                        email: user.email,
                        name: metadataName,
                        surname: metadataSurname,
                    })
                }
            })

        supabase
            .from("user_roles")
            .select("roles(id, name, can_create, can_read, can_update, can_delete, can_manage_roles, can_manage_assignees)")
            .eq("user_id", user.id)
            .single()
            .then(({ data }) => {
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
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, surname },
            },
        })

        if (error) {
            return { error: error as Error | null }
        }

        if (data.session && data.user) {
            const profileError = await upsertProfile(data.user.id, email, name, surname)
            if (profileError) {
                return { error: profileError }
            }
        }

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
        setSession(null)
        setUser(null)
        setProfile(null)
        setRole(null)
        return { error }
    }

    async function resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        return { error: error as Error | null }
    }

    return (
        <AuthContext value={{ session, user, profile, role, loading, signUp, signIn, signOut, resetPassword }}>
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
