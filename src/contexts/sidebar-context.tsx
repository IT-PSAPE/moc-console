import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { SidebarState } from '@/types'

interface SidebarActions {
  togglePortal: (portalId: string) => void
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  openMobile: () => void
  closeMobile: () => void
}

interface SidebarContextValue {
  state: SidebarState
  actions: SidebarActions
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidebarState>({
    expandedPortal: null,
    collapsed: false,
    mobileOpen: false,
  })

  const togglePortal = useCallback((portalId: string) => {
    setState((s) => ({
      ...s,
      expandedPortal: s.expandedPortal === portalId ? null : portalId,
    }))
  }, [])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setState((s) => ({ ...s, collapsed }))
  }, [])

  const toggleCollapsed = useCallback(() => {
    setState((s) => ({ ...s, collapsed: !s.collapsed }))
  }, [])

  const openMobile = useCallback(() => {
    setState((s) => ({ ...s, mobileOpen: true }))
  }, [])

  const closeMobile = useCallback(() => {
    setState((s) => ({ ...s, mobileOpen: false }))
  }, [])

  return (
    <SidebarContext.Provider value={{ state, actions: { togglePortal, setCollapsed, toggleCollapsed, openMobile, closeMobile } }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
