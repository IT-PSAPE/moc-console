import { useCallback, useEffect, useRef, useState } from 'react'
import type { LaneDragState, TimelineLane } from './types'

interface PendingLaneDragState extends LaneDragState {
    startY: number
    pointerId: number
    hasMoved: boolean
}

const LANE_DRAG_START_THRESHOLD_PX = 4

interface UseLaneDragOptions {
    lanes: TimelineLane[]
    onReorderLanes: (fromIndex: number, toIndex: number) => void
    disableTouchInteractions: boolean
}

export function useLaneDrag({ lanes, onReorderLanes, disableTouchInteractions }: UseLaneDragOptions) {
    const [laneDragState, setLaneDragState] = useState<LaneDragState | null>(null)
    const [isTrackingPointer, setIsTrackingPointer] = useState(false)
    const pendingRef = useRef<PendingLaneDragState | null>(null)

    const getLaneIndexFromPointer = useCallback((clientY: number, fallbackIndex: number) => {
        const els = document.querySelectorAll('[data-lane-header]')
        for (let i = 0; i < els.length; i++) {
            const rect = els[i].getBoundingClientRect()
            if (clientY >= rect.top && clientY <= rect.bottom) return i
        }
        return fallbackIndex
    }, [])

    const handleLaneDragStart = useCallback((laneId: string, index: number, e: React.PointerEvent) => {
        if (disableTouchInteractions && e.pointerType === 'touch') return
        pendingRef.current = {
            laneId,
            startIndex: index,
            currentIndex: index,
            startY: e.clientY,
            pointerId: e.pointerId,
            hasMoved: false,
        }
        setIsTrackingPointer(true)
    }, [disableTouchInteractions])

    const handleLaneDragMove = useCallback((e: PointerEvent) => {
        const pending = pendingRef.current
        if (!pending || e.pointerId !== pending.pointerId) return
        const deltaY = Math.abs(e.clientY - pending.startY)
        if (!pending.hasMoved && deltaY < LANE_DRAG_START_THRESHOLD_PX) return
        if (!pending.hasMoved) {
            pending.hasMoved = true
            setLaneDragState({ laneId: pending.laneId, startIndex: pending.startIndex, currentIndex: pending.startIndex })
        }
        const maxIndex = Math.max(lanes.length - 1, 0)
        const newIndex = Math.min(getLaneIndexFromPointer(e.clientY, pending.startIndex), maxIndex)
        if (newIndex === pending.currentIndex) return
        pending.currentIndex = newIndex
        setLaneDragState((prev) => (prev ? { ...prev, currentIndex: newIndex } : prev))
    }, [getLaneIndexFromPointer, lanes.length])

    const handleLaneDragEnd = useCallback((e: PointerEvent) => {
        const pending = pendingRef.current
        if (!pending || e.pointerId !== pending.pointerId) return
        if (pending.hasMoved && pending.startIndex !== pending.currentIndex) {
            onReorderLanes(pending.startIndex, pending.currentIndex)
        }
        pendingRef.current = null
        setLaneDragState(null)
        setIsTrackingPointer(false)
    }, [onReorderLanes])

    useEffect(() => {
        if (!isTrackingPointer) return
        window.addEventListener('pointermove', handleLaneDragMove)
        window.addEventListener('pointerup', handleLaneDragEnd)
        window.addEventListener('pointercancel', handleLaneDragEnd)
        return () => {
            window.removeEventListener('pointermove', handleLaneDragMove)
            window.removeEventListener('pointerup', handleLaneDragEnd)
            window.removeEventListener('pointercancel', handleLaneDragEnd)
        }
    }, [isTrackingPointer, handleLaneDragMove, handleLaneDragEnd])

    return { laneDragState, handleLaneDragStart }
}
