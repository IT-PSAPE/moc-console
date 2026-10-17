import { createContext, useContext } from 'react'

export type SidebarContextValue = {
    state: { isCollapsed: boolean; isLandscapeOpen: boolean; isResizing: boolean; width: number }
    actions: {
        toggleCollapsed: () => void
        openLandscape: () => void
        closeLandscape: () => void
        setLandscapeOpen: (open: boolean) => void
        expand: () => void
        /** Set the secondary sidebar width in px; clamped to [minWidth, maxWidth]. */
        setWidth: (width: number) => void
        resetWidth: () => void
        setResizing: (resizing: boolean) => void
    }
    meta: { minWidth: number; maxWidth: number; defaultWidth: number }
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
    const context = useContext(SidebarContext)
    if (!context) throw new Error('useSidebar must be used within a SidebarProvider')
    return context
}
