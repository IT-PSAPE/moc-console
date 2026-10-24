import { createContext, useContext, type ReactNode } from "react"
import { useUsersState, type UsersContextValue } from "./use-users-state"

const UsersContext = createContext<UsersContextValue | null>(null)

export function UsersProvider({ children }: { children: ReactNode }) {
  const value = useUsersState()
  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
}

export function useUsers() {
  const context = useContext(UsersContext)
  if (!context) throw new Error("useUsers must be used within a UsersProvider")
  return context
}
