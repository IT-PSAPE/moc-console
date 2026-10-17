import { createContext, useContext, type ReactNode } from 'react'
import { useUserPreferencesState } from './use-user-preferences-state'

const UserPreferencesContext = createContext<ReturnType<typeof useUserPreferencesState> | null>(null)

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const preferences = useUserPreferencesState()
  return <UserPreferencesContext value={preferences}>{children}</UserPreferencesContext>
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) throw new Error('useUserPreferences must be used within UserPreferencesProvider')
  return context
}
