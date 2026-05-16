import { createContext, useCallback, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { Button } from '@moc/ui/components/controls/button'
import { PanelLeft, PanelLeftClose } from 'lucide-react'

// ─── TopBar action slot (portal-based) ─────────────────

type TopBarSlotContextValue = {
    node: HTMLDivElement | null
    setNode: (node: HTMLDivElement | null) => void
}

const TopBarSlotContext = createContext<TopBarSlotContextValue>({ node: null, setNode: () => { } })

export function TopBarProvider({ children }: { children: ReactNode }) {
    const [node, setNode] = useState<HTMLDivElement | null>(null)
    return <TopBarSlotContext value={{ node, setNode }}>{children}</TopBarSlotContext>
}

export function TopBarActions({ children }: { children: ReactNode }) {
    const { node } = useContext(TopBarSlotContext)
    if (!node) return null
    return createPortal(children, node)
}

// ─── TopBar ────────────────────────────────────────────

export function TopBar({ children }: HTMLAttributes<HTMLDivElement>) {
    const { setNode } = useContext(TopBarSlotContext)
    const slotRef = useCallback((el: HTMLDivElement | null) => setNode(el), [setNode])
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
        <header
            className="area-topbar bg-primary border-b border-secondary flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)]"
        >
            <div className="flex items-center gap-2 w-full h-header">
                <Button.Icon
                    variant="ghost"
                    onClick={handleClick}
                    className="size-11 cursor-pointer"
                    aria-label={label}
                    icon={<Icon className="size-5" />}
                />
                {children}
                <div ref={slotRef} className="ml-auto flex items-center gap-2" />
            </div>
        </header>
    )
}
