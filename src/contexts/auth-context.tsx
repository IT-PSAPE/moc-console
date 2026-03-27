import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

interface AuthContextValue {
  state: AuthState
  actions: AuthActions
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_USER: UserProfile = {
  id: '1',
  email: 'admin@moc.gov',
  full_name: 'Admin User',
  role: 'admin',
  permissions: ['view', 'create', 'edit', 'delete', 'admin'],
  created_at: '2026-01-01T00:00:00Z',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })

  const login = useCallback(async (_email: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }))
    // Replace with supabase.auth.signInWithPassword
    await new Promise((r) => setTimeout(r, 800))
    setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    setState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ state, actions: { login, logout } }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
