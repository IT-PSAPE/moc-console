import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { User as Profile } from "@/types/requests/assignee"
import type { AppRole } from "@/types/requests/assignee"
import { supabase } from "./supabase"

type AuthState = {
    session: Session | null
    user: User | null
    profile: Profile | null
    role: AppRole | null
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
    const [role, setRole] = useState<AppRole | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        if (!user) {
            setProfile(null)
            setRole(null)
            return
        }

        supabase
            .from("users")
            .select("id, name, surname, email")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
                setProfile(data as Profile | null)
            })

        supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single()
            .then(({ data }) => {
                setRole((data?.role as AppRole) ?? null)
            })
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
