import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type SidebarContextValue = {
    state: {
        isCollapsed: boolean
        isMobileOpen: boolean
    }
    actions: {
        toggleCollapsed: () => void
        openMobile: () => void
        closeMobile: () => void
        setMobileOpen: (open: boolean) => void
    }
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), [])
    const openMobile = useCallback(() => setIsMobileOpen(true), [])
    const closeMobile = useCallback(() => setIsMobileOpen(false), [])

    const actions = useMemo(() => ({
        toggleCollapsed,
        openMobile,
        closeMobile,
        setMobileOpen: setIsMobileOpen,
    }), [toggleCollapsed, openMobile, closeMobile])

    const value: SidebarContextValue = useMemo(() => ({
        state: { isCollapsed, isMobileOpen },
        actions,
    }), [isCollapsed, isMobileOpen, actions])

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    )
}
