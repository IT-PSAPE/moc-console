import { createContext, useContext } from 'react'

export type SidebarContextValue = {
    state: { isCollapsed: boolean; isMobileOpen: boolean }
    actions: {
        toggleCollapsed: () => void
        openMobile: () => void
        closeMobile: () => void
        setMobileOpen: (open: boolean) => void
        expand: () => void
    }
    meta: Record<string, never>
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
    const context = useContext(SidebarContext)
    if (!context) throw new Error('useSidebar must be used within a SidebarProvider')
    return context
}
