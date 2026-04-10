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
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthState | null>(null)

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

        supabase
            .from("users")
            .select("id, name, surname, email")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
                if (isActive) {
                    setProfile(data as Profile | null)
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

    async function signUp(email: string, password: string) {
        const { error } = await supabase.auth.signUp({ email, password })
        return { error: error as Error | null }
    }

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error as Error | null }
    }

    async function signOut() {
        await supabase.auth.signOut()
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
