import { cn } from '@moc/utils/cn'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { Button } from '../controls/button'
import { OverlayContent, OverlayFooter, OverlayHeader } from '../overlays/overlay-primitives'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { Drawer } from '../overlays/drawer'

type SplitPanelContextValue = {
    state: {
        isDesktopOpen: boolean
        isMobile: boolean
        isOpen: boolean
        isResizing: boolean
        maximumRatio: number
        minimumRatio: number
        primaryRatio: number
    }
    actions: {
        close: () => void
        open: () => void
        resetRatio: () => void
        resizeAt: (clientX: number) => void
        resizeBy: (amount: number) => void
        resizeToBoundary: (boundary: 'minimum' | 'maximum') => void
        setResizing: (resizing: boolean) => void
        setOpen: (open: boolean) => void
    }
    meta: {
        detailLabel: string
        detailRef: RefObject<HTMLDivElement | null>
        primaryRef: RefObject<HTMLDivElement | null>
        rootRef: RefObject<HTMLDivElement | null>
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
    defaultRatio?: number
    detailLabel: string
    onRatioChange?: (ratio: number) => void
    onOpenChange: (open: boolean) => void
    open: boolean
    ratio?: number
}

const DEFAULT_RATIO = 0.38

function getPixelConstraint(value: string, fallback: number) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function SplitPanelRoot({ children, className, defaultRatio = DEFAULT_RATIO, detailLabel, onRatioChange, onOpenChange, open, ratio, ...props }: SplitPanelRootProps) {
    const isMobile = useIsMobile()
    const isOpen = open
    const isDesktopOpen = open && !isMobile
    const rootRef = useRef<HTMLDivElement | null>(null)
    const primaryRef = useRef<HTMLDivElement | null>(null)
    const detailRef = useRef<HTMLDivElement | null>(null)
    const [uncontrolledRatio, setUncontrolledRatio] = useState(defaultRatio)
    const [isResizing, setResizing] = useState(false)
    const [ratioBounds, setRatioBounds] = useState({ minimum: 0, maximum: 1 })
    const primaryRatio = ratio ?? uncontrolledRatio

    const getRatioBounds = useCallback(() => {
        const rootWidth = rootRef.current?.getBoundingClientRect().width ?? 0
        const primary = primaryRef.current
        const detail = detailRef.current

        if (rootWidth <= 0 || !primary || !detail) return { minimum: 0, maximum: 1 }

        const primaryStyle = window.getComputedStyle(primary)
        const detailStyle = window.getComputedStyle(detail)
        const primaryMin = getPixelConstraint(primaryStyle.minWidth, 0)
        const primaryMax = getPixelConstraint(primaryStyle.maxWidth, rootWidth)
        const detailMin = getPixelConstraint(detailStyle.minWidth, 0)
        const detailMax = getPixelConstraint(detailStyle.maxWidth, rootWidth)

        return {
            minimum: Math.max(0, primaryMin / rootWidth, 1 - detailMax / rootWidth),
            maximum: Math.min(1, primaryMax / rootWidth, 1 - detailMin / rootWidth),
        }
    }, [])

    const updateRatio = useCallback((nextRatio: number) => {
        const bounds = getRatioBounds()
        const clampedRatio = Math.min(bounds.maximum, Math.max(bounds.minimum, nextRatio))
        if (ratio === undefined) setUncontrolledRatio(clampedRatio)
        onRatioChange?.(clampedRatio)
    }, [getRatioBounds, onRatioChange, ratio])

    const resizeAt = useCallback((clientX: number) => {
        const rootBounds = rootRef.current?.getBoundingClientRect()
        if (!rootBounds || rootBounds.width <= 0) return
        updateRatio((clientX - rootBounds.left) / rootBounds.width)
    }, [updateRatio])

    const resizeBy = useCallback((amount: number) => updateRatio(primaryRatio + amount), [primaryRatio, updateRatio])
    const resizeToBoundary = useCallback((boundary: 'minimum' | 'maximum') => updateRatio(getRatioBounds()[boundary]), [getRatioBounds, updateRatio])
    const resetRatio = useCallback(() => updateRatio(defaultRatio), [defaultRatio, updateRatio])
    const close = useCallback(() => onOpenChange(false), [onOpenChange])
    const openPanel = useCallback(() => onOpenChange(true), [onOpenChange])

    useEffect(() => {
        if (!isDesktopOpen || !rootRef.current) return

        function syncRatioBounds() {
            setRatioBounds(getRatioBounds())
        }

        const frame = window.requestAnimationFrame(syncRatioBounds)
        const observer = new ResizeObserver(syncRatioBounds)
        observer.observe(rootRef.current)

        return () => {
            window.cancelAnimationFrame(frame)
            observer.disconnect()
        }
    }, [getRatioBounds, isDesktopOpen])

    const value = useMemo<SplitPanelContextValue>(() => ({
        state: { isDesktopOpen, isMobile, isOpen, isResizing, maximumRatio: ratioBounds.maximum, minimumRatio: ratioBounds.minimum, primaryRatio },
        actions: {
            close,
            open: openPanel,
            resetRatio,
            resizeAt,
            resizeBy,
            resizeToBoundary,
            setResizing,
            setOpen: onOpenChange,
        },
        meta: { detailLabel, detailRef, primaryRef, rootRef },
    }), [close, detailLabel, isDesktopOpen, isMobile, isOpen, isResizing, onOpenChange, openPanel, primaryRatio, ratioBounds.maximum, ratioBounds.minimum, resetRatio, resizeAt, resizeBy, resizeToBoundary])

    return (
        <SplitPanelContext.Provider value={value}>
            <div ref={rootRef} className={cn('flex h-full min-h-0 min-w-0 overflow-hidden', isResizing && 'cursor-col-resize select-none', className)} {...props}>
                {children}
            </div>
        </SplitPanelContext.Provider>
    )
}

type SplitPanelPaneProps = HTMLAttributes<HTMLDivElement> & {
    maxWidth?: CSSProperties['maxWidth']
    minWidth?: CSSProperties['minWidth']
}

function getPaneStyle({ maxWidth, minWidth, ratio }: Pick<SplitPanelPaneProps, 'maxWidth' | 'minWidth'> & { ratio: number }): CSSProperties {
    return {
        flexBasis: 0,
        flexGrow: ratio,
        flexShrink: 1,
        maxWidth,
        minWidth,
    }
}

function SplitPanelPrimary({ children, className, maxWidth = '44rem', minWidth = '18rem', style, ...props }: SplitPanelPaneProps) {
    const { state, meta } = useSplitPanel()
    const paneStyle = state.isDesktopOpen ? getPaneStyle({ maxWidth, minWidth, ratio: state.primaryRatio }) : undefined

    return (
        <div ref={meta.primaryRef} className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto', state.isDesktopOpen && 'max-lg:hidden', className)} style={{ ...paneStyle, ...style }} {...props}>
            {children}
        </div>
    )
}

function SplitPanelDetail({ children, className, maxWidth, minWidth = '28rem', style, ...props }: SplitPanelPaneProps) {
    const { state, actions, meta } = useSplitPanel()

    useEffect(() => {
        if (state.isDesktopOpen) meta.detailRef.current?.focus()
    }, [meta.detailRef, state.isDesktopOpen])

    if (!state.isOpen) return null

    if (state.isMobile) {
        return (
            <Drawer open={state.isOpen} onOpenChange={actions.setOpen} mobileSide="bottom">
                <Drawer.Portal>
                    <Drawer.Backdrop />
                    <Drawer.Panel>{children}</Drawer.Panel>
                </Drawer.Portal>
            </Drawer>
        )
    }

    return (
        <div
            ref={meta.detailRef}
            aria-label={meta.detailLabel}
            className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-secondary bg-primary outline-none max-lg:!min-w-0 max-lg:!max-w-none max-lg:!flex-1', className)}
            role="region"
            style={{ ...getPaneStyle({ maxWidth, minWidth, ratio: 1 - state.primaryRatio }), ...style }}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}

function SplitPanelResizeHandle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state, actions } = useSplitPanel()
    const draggingRef = useRef(false)

    if (!state.isDesktopOpen) return null

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        draggingRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        actions.setResizing(true)
        actions.resizeAt(event.clientX)
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (!draggingRef.current) return
        actions.resizeAt(event.clientX)
    }

    function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
        if (!draggingRef.current) return
        draggingRef.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        actions.setResizing(false)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const amount = event.shiftKey ? 0.1 : 0.02
        if (event.key === 'ArrowLeft') actions.resizeBy(-amount)
        else if (event.key === 'ArrowRight') actions.resizeBy(amount)
        else if (event.key === 'Home') actions.resizeToBoundary('minimum')
        else if (event.key === 'End') actions.resizeToBoundary('maximum')
        else return
        event.preventDefault()
    }

    return (
        <div
            {...props}
            aria-label="Resize list and detail panels"
            aria-orientation="vertical"
            aria-valuemax={Math.round(state.maximumRatio * 100)}
            aria-valuemin={Math.round(state.minimumRatio * 100)}
            aria-valuenow={Math.round(state.primaryRatio * 100)}
            aria-valuetext={`${Math.round(state.primaryRatio * 100)}% list, ${Math.round((1 - state.primaryRatio) * 100)}% details`}
            className={cn('group relative z-10 hidden w-px shrink-0 cursor-col-resize touch-none bg-secondary outline-none lg:block', 'before:absolute before:inset-y-0 before:left-1/2 before:w-3 before:-translate-x-1/2', 'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent after:transition-colors', 'hover:after:bg-brand focus-visible:after:bg-brand', state.isResizing && 'after:bg-brand', className)}
            onDoubleClick={actions.resetRatio}
            onKeyDown={handleKeyDown}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            role="separator"
            tabIndex={0}
        />
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
    ResizeHandle: SplitPanelResizeHandle,
})
