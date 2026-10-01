import { createContext, useCallback, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { Button } from '@moc/ui/components/controls/button'
import { PanelLeft } from 'lucide-react'

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
    const { actions } = useSidebar()
    const isMobile = useIsMobile()

    return (
        <header
            className="flex shrink-0 items-center gap-2 md:[&:not(:has([data-topbar-actions]:not(:empty)))]:hidden border-b border-secondary pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]"
        >
            <div className="flex items-center gap-2 w-full h-header">
                {isMobile && (
                    <Button.Icon variant="ghost" onClick={actions.openMobile} className="size-11" aria-label="Open sidebar" icon={<PanelLeft className="size-5" />} />
                )}
                {children}
                <div data-topbar-actions ref={slotRef} className="ml-auto flex items-center gap-2 max-mobile:[&_button]:min-w-11 max-mobile:[&_button]:px-2 max-mobile:[&_.label-sm]:sr-only" />
            </div>
        </header>
    )
}
