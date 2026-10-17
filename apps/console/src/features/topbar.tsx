import { createContext, useCallback, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
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
    const isLandscape = useIsLandscape()

    return (
        <header
            className="flex h-header shrink-0 items-center gap-2 border-b border-secondary pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] [&:not(:has([data-topbar-actions]:not(:empty)))]:hidden landscape:[&:not(:has([data-topbar-actions]:not(:empty)))]:flex"
        >
            {isLandscape && (
                <Button.Icon variant="ghost" onClick={actions.openLandscape} aria-label="Open sidebar" icon={<PanelLeft />} />
            )}
            {children}
            <div data-topbar-actions ref={slotRef} className="ml-auto flex items-center gap-2 landscape:[&_.label-sm]:sr-only" />
        </header>
    )
}
