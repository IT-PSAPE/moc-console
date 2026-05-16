import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { useLane, useTimeline } from './context'
import { TIMELINE_HORIZONTAL_PADDING } from './types'

type BlockShape = { id: string; start: number; duration: number }

const BlockContext = createContext<BlockShape | null>(null)

function useBlock() {
    const ctx = useContext(BlockContext)
    if (!ctx) throw new Error('Block sub-parts must be used within <Timeline.Block>')
    return ctx
}

type BlockProps = {
    id: string
    start: number
    duration: number
    /**
     * Optional click handler (e.g. open an edit modal). Provided → the block
     * is clickable; omitted → it is not. Click is suppressed right after a
     * drag. Not a boolean toggle — see ADR-0003.
     */
    onClick?: () => void
    children?: ReactNode
    className?: string
    style?: React.CSSProperties
}

export function TimelineBlock({ id, start, duration, onClick, children, className, style }: BlockProps) {
    const { pixelsPerUnit, justDraggedRef, blockDragState } = useTimeline()
    const block = useMemo<BlockShape>(() => ({ id, start, duration }), [id, start, duration])
    const isBeingDragged = blockDragState?.blockId === id

    return (
        <BlockContext.Provider value={block}>
            <div
                className={cn(
                    'absolute top-1 bottom-1 rounded-lg flex flex-col shadow-sm group select-none overflow-hidden transition-opacity',
                    onClick && 'cursor-pointer',
                    isBeingDragged && 'ring-2 ring-white/50 z-10',
                    className,
                )}
                style={{
                    left: start * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING,
                    width: Math.max(duration * pixelsPerUnit, 24),
                    ...style,
                }}
                onClick={onClick ? (e) => {
                    e.stopPropagation()
                    if (!justDraggedRef.current) onClick()
                } : undefined}
            >
                {children}
            </div>
        </BlockContext.Provider>
    )
}

// ─── Affordance sub-parts (presence = capability — see ADR-0003) ────

/** Makes the whole block draggable along/across lanes. */
function BlockMove({ className }: { className?: string }) {
    const { startBlockDrag } = useTimeline()
    const { laneId } = useLane()
    const block = useBlock()
    return (
        <div
            className={cn('absolute inset-0 touch-none cursor-move', className)}
            onPointerDown={(e) => startBlockDrag(e, block, laneId, 'move')}
        />
    )
}

/** Left edge — drag to change start (and duration). */
function BlockResizeStart({ className }: { className?: string }) {
    const { startBlockDrag } = useTimeline()
    const { laneId } = useLane()
    const block = useBlock()
    return (
        <div
            className={cn('absolute left-0 top-0 bottom-0 w-2 rounded-l-lg z-10 touch-none cursor-ew-resize hover:bg-black/10', className)}
            onPointerDown={(e) => startBlockDrag(e, block, laneId, 'resize-start')}
        />
    )
}

/** Right edge — drag to change duration. */
function BlockResizeEnd({ className }: { className?: string }) {
    const { startBlockDrag } = useTimeline()
    const { laneId } = useLane()
    const block = useBlock()
    return (
        <div
            className={cn('absolute right-0 top-0 bottom-0 w-2 rounded-r-lg z-10 touch-none cursor-ew-resize hover:bg-black/10', className)}
            onPointerDown={(e) => startBlockDrag(e, block, laneId, 'resize-end')}
        />
    )
}

/** A delete trigger. Wrap your own icon/label as children. */
function BlockRemove({ children, className }: { children: ReactNode; className?: string }) {
    const { removeBlock } = useTimeline()
    const { laneId } = useLane()
    const block = useBlock()
    return (
        <button
            type="button"
            className={cn('relative z-20', className)}
            onClick={(e) => {
                e.stopPropagation()
                removeBlock(laneId, block.id)
            }}
        >
            {children}
        </button>
    )
}

TimelineBlock.Move = BlockMove
TimelineBlock.ResizeStart = BlockResizeStart
TimelineBlock.ResizeEnd = BlockResizeEnd
TimelineBlock.Remove = BlockRemove
