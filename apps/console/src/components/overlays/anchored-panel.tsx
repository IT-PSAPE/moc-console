import { cn } from '@/utils/cn'
import { createPortal } from 'react-dom'
import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { useAnchorPosition, useClickOutside, type Placement } from './overlay-primitives'
import { useOverlayStack } from './overlay-provider'

// ─── AnchoredPanel ────────────────────────────────────────────────────
//
// A low-level floating-panel primitive. Use this when you need a panel
// anchored to an element, but you can't or don't want to use the Popover
// compound (e.g. the "trigger" is a search input that should open on focus
// or typing, not on click).
//
// AnchoredPanel takes an explicit `anchor` element ref and an `open` flag,
// and handles:
//   - portaling to the overlay root (so it renders on top of everything,
//     not constrained by ancestor overflow:auto / scroll containers)
//   - viewport-aware positioning via `useAnchorPosition` (auto-flips)
//   - close on outside click and on Escape
//
// It does NOT manage open/close transitions — the caller controls `open`
// and reacts to `onClose`. Use this primitive any time naive `position:
// absolute` would get clipped by a scroll ancestor (modal content, drawer
// content, popover panels, etc).

type AnchoredPanelProps = HTMLAttributes<HTMLDivElement> & {
    /** The DOM element to anchor against. */
    anchor: HTMLElement | null
    /** Whether the panel is shown. */
    open: boolean
    /** Called when an outside click or Escape should close the panel. */
    onClose: () => void
    /** Preferred placement; auto-flips on overflow. Default: bottom-start. */
    placement?: Placement
    /** Distance in pixels between the anchor and the panel. Default: 4. */
    offset?: number
    /** When true, the panel renders at the same width as the anchor. */
    matchAnchorWidth?: boolean
    /** Extra elements that should NOT count as "outside" (e.g. nested popovers). */
    additionalInsideElements?: Array<HTMLElement | null>
    /** Disable the Escape-to-close behavior. */
    disableEscapeClose?: boolean
    children: ReactNode
}

export function AnchoredPanel({
    anchor,
    open,
    onClose,
    placement = 'bottom-start',
    offset = 4,
    matchAnchorWidth = false,
    additionalInsideElements,
    disableEscapeClose = false,
    className,
    style,
    children,
    ...rest
}: AnchoredPanelProps) {
    const { state: overlayState, meta: overlayMeta } = useOverlayStack()
    const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null)
    const position = useAnchorPosition(anchor, panelEl, open, placement, offset)
    const zIndex = overlayMeta.baseZIndex + 50

    const insideElements = [anchor, panelEl, ...(additionalInsideElements ?? [])]
    useClickOutside(insideElements, open, onClose)

    useEffect(() => {
        if (!open || disableEscapeClose) return undefined

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return
            event.preventDefault()
            onClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose, disableEscapeClose])

    if (!open || !overlayState.rootElement) return null

    const anchorWidth = matchAnchorWidth && anchor
        ? anchor.getBoundingClientRect().width
        : undefined

    const panelStyle: CSSProperties = {
        top: position.top,
        left: position.left,
        zIndex,
        maxHeight: position.maxHeight,
        maxWidth: position.maxWidth,
        visibility: position.isPositioned ? 'visible' : 'hidden',
        ...(anchorWidth !== undefined ? { width: anchorWidth, maxWidth: 'none' } : {}),
        ...style,
    }

    return createPortal(
        <div
            ref={setPanelEl}
            role="dialog"
            tabIndex={-1}
            className={cn(
                'pointer-events-auto fixed flex flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-secondary bg-primary shadow-lg',
                className,
            )}
            style={panelStyle}
            {...rest}
        >
            {children}
        </div>,
        overlayState.rootElement,
    )
}
