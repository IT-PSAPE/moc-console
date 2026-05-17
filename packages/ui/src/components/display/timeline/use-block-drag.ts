import { useCallback, useEffect, useRef, useState } from 'react'
import { BLOCK_DRAG_CLICK_SUPPRESS_MS, type BlockDragState, type TimelineLane } from './types'

interface UseBlockDragOptions {
    lanes: TimelineLane[]
    total: number
    pixelsPerUnit: number
    laneRowsRef: React.RefObject<HTMLDivElement | null>
    disableTouchInteractions: boolean
    onMoveBlock: (blockId: string, laneId: string, start: number) => void
    onUpdateBlock: (laneId: string, blockId: string, updates: { start?: number; duration?: number }) => void
}

export function useBlockDrag({ lanes, total, pixelsPerUnit, laneRowsRef, disableTouchInteractions, onMoveBlock, onUpdateBlock }: UseBlockDragOptions) {
    const [dragState, setDragState] = useState<BlockDragState | null>(null)
    const justDraggedRef = useRef(false)
    const resetTimeoutRef = useRef<number | null>(null)

    const getLaneAtY = useCallback((clientY: number): string | null => {
        if (!laneRowsRef.current) return null
        const rows = laneRowsRef.current.querySelectorAll('[data-lane-id]')
        for (const row of rows) {
            const rect = row.getBoundingClientRect()
            if (clientY >= rect.top && clientY <= rect.bottom) {
                const laneId = row.getAttribute('data-lane-id')
                return laneId && lanes.some((l) => l.id === laneId) ? laneId : null
            }
        }
        return null
    }, [laneRowsRef, lanes])

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!dragState) return
        const deltaX = e.clientX - dragState.startX
        const deltaY = e.clientY - dragState.startY
        const deltaUnits = Math.round(deltaX / pixelsPerUnit)

        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) justDraggedRef.current = true

        if (dragState.type === 'move') {
            const newStart = Math.max(0, Math.min(total - 1, dragState.startValue + deltaUnits))
            const newLaneId = getLaneAtY(e.clientY) ?? dragState.laneId
            onMoveBlock(dragState.blockId, newLaneId, newStart)
        } else if (dragState.type === 'resize-end') {
            const newDuration = Math.max(1, dragState.startDuration + deltaUnits)
            onUpdateBlock(dragState.laneId, dragState.blockId, { duration: newDuration })
        } else if (dragState.type === 'resize-start') {
            const newStart = Math.max(0, dragState.startValue + deltaUnits)
            const startDelta = newStart - dragState.startValue
            const newDuration = Math.max(1, dragState.startDuration - startDelta)
            onUpdateBlock(dragState.laneId, dragState.blockId, { start: newStart, duration: newDuration })
        }
    }, [dragState, pixelsPerUnit, total, getLaneAtY, onMoveBlock, onUpdateBlock])

    const handlePointerUp = useCallback(() => {
        if (resetTimeoutRef.current !== null) {
            window.clearTimeout(resetTimeoutRef.current)
            resetTimeoutRef.current = null
        }
        if (justDraggedRef.current) {
            resetTimeoutRef.current = window.setTimeout(() => {
                justDraggedRef.current = false
                resetTimeoutRef.current = null
            }, BLOCK_DRAG_CLICK_SUPPRESS_MS)
        }
        setDragState(null)
    }, [])

    useEffect(() => {
        if (!dragState) return
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [dragState, handlePointerMove, handlePointerUp])

    useEffect(() => {
        if (!disableTouchInteractions) return
        const frameId = window.requestAnimationFrame(() => setDragState(null))
        return () => window.cancelAnimationFrame(frameId)
    }, [disableTouchInteractions])

    useEffect(() => () => {
        if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current)
    }, [])

    const startBlockDrag = useCallback((e: React.PointerEvent, block: { id: string; start: number; duration: number }, laneId: string, type: BlockDragState['type']) => {
        if (disableTouchInteractions && e.pointerType === 'touch') return
        e.stopPropagation()
        e.preventDefault()
        if (resetTimeoutRef.current !== null) {
            window.clearTimeout(resetTimeoutRef.current)
            resetTimeoutRef.current = null
        }
        justDraggedRef.current = false
        setDragState({
            blockId: block.id,
            laneId,
            type,
            startX: e.clientX,
            startY: e.clientY,
            startValue: block.start,
            startDuration: block.duration,
        })
    }, [disableTouchInteractions])

    return { dragState, justDraggedRef, startBlockDrag }
}
