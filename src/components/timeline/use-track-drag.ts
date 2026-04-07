import { useCallback, useEffect, useRef, useState } from 'react'
import type { Track } from '@/types/cue-sheet'

// ─── Types ─────────────────────────────────────────────────────────

interface TrackDragState {
    trackId: string
    startIndex: number
    currentIndex: number
    startY: number
}

interface PendingTrackDragState extends TrackDragState {
    pointerId: number
    hasMoved: boolean
}

const TRACK_DRAG_START_THRESHOLD_PX = 4

// ─── Hook ──────────────────────────────────────────────────────────

interface UseTrackDragOptions {
    tracks: Track[]
    onReorderTracks: (fromIndex: number, toIndex: number) => void
    disableTouchInteractions: boolean
}

export function useTrackDrag({ tracks, onReorderTracks, disableTouchInteractions }: UseTrackDragOptions) {
    const [trackDragState, setTrackDragState] = useState<TrackDragState | null>(null)
    const [isTrackingPointer, setIsTrackingPointer] = useState(false)
    const pendingTrackDragRef = useRef<PendingTrackDragState | null>(null)

    const getTrackIndexFromPointer = useCallback((clientY: number, fallbackIndex: number) => {
        const trackElements = document.querySelectorAll('[data-track-sidebar]')
        for (let i = 0; i < trackElements.length; i++) {
            const rect = trackElements[i].getBoundingClientRect()
            if (clientY >= rect.top && clientY <= rect.bottom) {
                return i
            }
        }
        return fallbackIndex
    }, [])

    const handleTrackDragStart = useCallback((trackId: string, index: number, e: React.PointerEvent) => {
        if (disableTouchInteractions && e.pointerType === 'touch') return
        pendingTrackDragRef.current = {
            trackId,
            startIndex: index,
            currentIndex: index,
            startY: e.clientY,
            pointerId: e.pointerId,
            hasMoved: false,
        }
        setIsTrackingPointer(true)
    }, [disableTouchInteractions])

    const handleTrackDragMove = useCallback((e: PointerEvent) => {
        const pending = pendingTrackDragRef.current
        if (!pending) return
        if (e.pointerId !== pending.pointerId) return

        const deltaY = Math.abs(e.clientY - pending.startY)
        if (!pending.hasMoved && deltaY < TRACK_DRAG_START_THRESHOLD_PX) return

        if (!pending.hasMoved) {
            pending.hasMoved = true
            setTrackDragState({
                trackId: pending.trackId,
                startIndex: pending.startIndex,
                currentIndex: pending.startIndex,
                startY: pending.startY,
            })
        }

        const newIndex = getTrackIndexFromPointer(e.clientY, pending.startIndex)
        if (newIndex === pending.currentIndex) return

        pending.currentIndex = newIndex
        setTrackDragState((prev) => prev ? { ...prev, currentIndex: newIndex } : prev)
    }, [getTrackIndexFromPointer])

    const handleTrackDragEnd = useCallback((e: PointerEvent) => {
        const pending = pendingTrackDragRef.current
        if (!pending) return
        if (e.pointerId !== pending.pointerId) return

        if (pending.hasMoved && pending.startIndex !== pending.currentIndex) {
            onReorderTracks(pending.startIndex, pending.currentIndex)
        }

        pendingTrackDragRef.current = null
        setTrackDragState(null)
        setIsTrackingPointer(false)
    }, [onReorderTracks])

    useEffect(() => {
        if (isTrackingPointer) {
            window.addEventListener('pointermove', handleTrackDragMove)
            window.addEventListener('pointerup', handleTrackDragEnd)
            window.addEventListener('pointercancel', handleTrackDragEnd)
            return () => {
                window.removeEventListener('pointermove', handleTrackDragMove)
                window.removeEventListener('pointerup', handleTrackDragEnd)
                window.removeEventListener('pointercancel', handleTrackDragEnd)
            }
        }
    }, [isTrackingPointer, handleTrackDragMove, handleTrackDragEnd])

    return { trackDragState, handleTrackDragStart }
}
