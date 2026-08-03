import { cn } from '@moc/utils/cn'
import { X } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, type ComponentProps, type CSSProperties, type HTMLAttributes } from 'react'
import { Button } from '../controls/button'
import { OverlayContent, OverlayFooter, OverlayHeader } from '../overlays/overlay-primitives'
import { useIsMobile } from '../../hooks/use-is-mobile'

type SplitPanelContextValue = {
    state: {
        isOpen: boolean
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (open: boolean) => void
    }
    meta: {
        detailLabel: string
    }
}

const SplitPanelContext = createContext<SplitPanelContextValue | null>(null)

export function useSplitPanel() {
    const context = useContext(SplitPanelContext)

    if (!context) {
        throw new Error('useSplitPanel must be used within a SplitPanel')
    }

    return context
}

type SplitPanelRootProps = HTMLAttributes<HTMLDivElement> & {
    detailLabel: string
    onOpenChange: (open: boolean) => void
    open: boolean
}

function SplitPanelRoot({ children, className, detailLabel, onOpenChange, open, ...props }: SplitPanelRootProps) {
    const isMobile = useIsMobile()
    const isOpen = open && !isMobile
    const value = useMemo<SplitPanelContextValue>(() => ({
        state: { isOpen },
        actions: {
            close: () => onOpenChange(false),
            open: () => onOpenChange(true),
            setOpen: onOpenChange,
        },
        meta: { detailLabel },
    }), [detailLabel, isOpen, onOpenChange])

    return (
        <SplitPanelContext.Provider value={value}>
            <div className={cn('flex h-full min-h-0 min-w-0 overflow-hidden', className)} {...props}>
                {children}
            </div>
        </SplitPanelContext.Provider>
    )
}

type SplitPanelPaneProps = HTMLAttributes<HTMLDivElement> & {
    maxWidth?: CSSProperties['maxWidth']
    minWidth?: CSSProperties['minWidth']
    ratio?: number
}

function getPaneStyle({ maxWidth, minWidth, ratio = 1 }: Pick<SplitPanelPaneProps, 'maxWidth' | 'minWidth' | 'ratio'>): CSSProperties {
    return {
        flexBasis: 0,
        flexGrow: ratio,
        flexShrink: 1,
        maxWidth,
        minWidth,
    }
}

function SplitPanelPrimary({ children, className, maxWidth = '44rem', minWidth = '18rem', ratio = 0.38, style, ...props }: SplitPanelPaneProps) {
    const { state } = useSplitPanel()
    const paneStyle = state.isOpen ? getPaneStyle({ maxWidth, minWidth, ratio }) : undefined

    return (
        <div className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto', state.isOpen && 'max-lg:hidden', className)} style={{ ...paneStyle, ...style }} {...props}>
            {children}
        </div>
    )
}

function SplitPanelDetail({ children, className, maxWidth, minWidth = '28rem', ratio = 0.62, style, ...props }: SplitPanelPaneProps) {
    const { state, meta } = useSplitPanel()
    const detailRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (state.isOpen) detailRef.current?.focus()
    }, [state.isOpen])

    if (!state.isOpen) return null

    return (
        <div
            ref={detailRef}
            aria-label={meta.detailLabel}
            className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-secondary bg-primary outline-none max-lg:!min-w-0 max-lg:!max-w-none max-lg:!flex-1', className)}
            role="region"
            style={{ ...getPaneStyle({ maxWidth, minWidth, ratio }), ...style }}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}

function SplitPanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <OverlayHeader className={className} {...props} />
}

function SplitPanelContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <OverlayContent className={className} {...props} />
}

function SplitPanelFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <OverlayFooter className={className} {...props} />
}

function SplitPanelClose({ 'aria-label': ariaLabel = 'Close detail panel', ...props }: Omit<ComponentProps<typeof Button.Icon>, 'icon'>) {
    const { actions } = useSplitPanel()
    return <Button.Icon aria-label={ariaLabel} variant="ghost" icon={<X />} {...props} onClick={actions.close} />
}

export const SplitPanel = Object.assign(SplitPanelRoot, {
    Close: SplitPanelClose,
    Content: SplitPanelContent,
    Detail: SplitPanelDetail,
    Footer: SplitPanelFooter,
    Header: SplitPanelHeader,
    Primary: SplitPanelPrimary,
})
