import type { HTMLAttributes } from 'react'
import { useSidebar } from '../navigation/sidebar'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { PanelLeft, PanelLeftClose } from 'lucide-react'

export function TopBar({ children }: HTMLAttributes<HTMLDivElement>) {
    const { state, actions } = useSidebar()
    const isMobile = useIsMobile()

    function handleClick() {
        if (isMobile) {
            actions.setMobileOpen(!state.isMobileOpen)
        } else {
            actions.toggleCollapsed()
        }
    }

    const Icon = isMobile
        ? (state.isMobileOpen ? PanelLeftClose : PanelLeft)
        : (state.isCollapsed ? PanelLeft : PanelLeftClose)

    const label = isMobile
        ? (state.isMobileOpen ? 'Close sidebar' : 'Open sidebar')
        : (state.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')

    return (
        <header className="area-topbar h-header border-b border-secondary flex items-center gap-2 px-4">
            <button
                type="button"
                onClick={handleClick}
                className="size-8 flex items-center justify-center rounded-md hover:bg-[var(--background-color-secondary_hover)] text-[var(--text-color-secondary)] cursor-pointer"
                aria-label={label}
            >
                <Icon className="size-5" />
            </button>
            {children}
        </header>
    )
}
