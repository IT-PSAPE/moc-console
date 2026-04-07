import { useCallback, useEffect, useRef, useState } from 'react'
import type { Cue, Track } from '@/types/cue-sheet'
import { CUE_DRAG_CLICK_SUPPRESS_MS, type CueDragState } from './timeline-types'

interface UseCueDragOptions {
    tracks: Track[]
    totalMinutes: number
    pixelsPerMinute: number
    trackRowsRef: React.RefObject<HTMLDivElement | null>
    disableTouchInteractions: boolean
    onMoveCue: (cueId: string, trackId: string, startMinute: number) => void
    onUpdateCue: (trackId: string, cueId: string, updates: Partial<Omit<Cue, 'id'>>) => void
}

export function useCueDrag({ tracks, totalMinutes, pixelsPerMinute, trackRowsRef, disableTouchInteractions, onMoveCue, onUpdateCue }: UseCueDragOptions) {
    const [dragState, setDragState] = useState<CueDragState | null>(null)
    const justDraggedRef = useRef(false)
    const cueDragResetTimeoutRef = useRef<number | null>(null)

    const getTrackAtY = useCallback((clientY: number): string | null => {
        if (!trackRowsRef.current) return null
        const trackRows = trackRowsRef.current.querySelectorAll('[data-track-id]')
        for (const row of trackRows) {
            const rect = row.getBoundingClientRect()
            if (clientY >= rect.top && clientY <= rect.bottom) {
                const trackId = row.getAttribute('data-track-id')
                return trackId && tracks.some((track) => track.id === trackId) ? trackId : null
            }
        }
        return null
    }, [trackRowsRef, tracks])

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!dragState) return

        const deltaX = e.clientX - dragState.startX
        const deltaY = e.clientY - dragState.startY
        const deltaMinutes = Math.round(deltaX / pixelsPerMinute)

        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            justDraggedRef.current = true
        }

        if (dragState.type === 'move') {
            const newStart = Math.max(0, Math.min(totalMinutes - 1, dragState.startMinute + deltaMinutes))
            const newTrackId = getTrackAtY(e.clientY) ?? dragState.trackId
            onMoveCue(dragState.cueId, newTrackId, newStart)
        } else if (dragState.type === 'resize-right') {
            const newDuration = Math.max(1, dragState.startDuration + deltaMinutes)
            onUpdateCue(dragState.trackId, dragState.cueId, { durationMin: newDuration })
        } else if (dragState.type === 'resize-left') {
            const newStart = Math.max(0, dragState.startMinute + deltaMinutes)
            const startDelta = newStart - dragState.startMinute
            const newDuration = Math.max(1, dragState.startDuration - startDelta)
            onUpdateCue(dragState.trackId, dragState.cueId, { startMin: newStart, durationMin: newDuration })
        }
    }, [dragState, pixelsPerMinute, totalMinutes, getTrackAtY, onMoveCue, onUpdateCue])

    const handlePointerUp = useCallback(() => {
        if (cueDragResetTimeoutRef.current !== null) {
            window.clearTimeout(cueDragResetTimeoutRef.current)
            cueDragResetTimeoutRef.current = null
        }
        if (justDraggedRef.current) {
            cueDragResetTimeoutRef.current = window.setTimeout(() => {
                justDraggedRef.current = false
                cueDragResetTimeoutRef.current = null
            }, CUE_DRAG_CLICK_SUPPRESS_MS)
        }
        setDragState(null)
    }, [])

    useEffect(() => {
        if (dragState) {
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', handlePointerUp)
            return () => {
                window.removeEventListener('pointermove', handlePointerMove)
                window.removeEventListener('pointerup', handlePointerUp)
            }
        }
    }, [dragState, handlePointerMove, handlePointerUp])

    useEffect(() => {
        if (!disableTouchInteractions) return
        setDragState(null)
    }, [disableTouchInteractions])

    useEffect(() => {
        return () => {
            if (cueDragResetTimeoutRef.current !== null) {
                window.clearTimeout(cueDragResetTimeoutRef.current)
            }
        }
    }, [])

    const startCueDrag = useCallback((e: React.PointerEvent, cue: Cue, trackId: string, type: 'move' | 'resize-left' | 'resize-right') => {
        if (disableTouchInteractions && e.pointerType === 'touch') return
        e.stopPropagation()
        e.preventDefault()
        if (cueDragResetTimeoutRef.current !== null) {
            window.clearTimeout(cueDragResetTimeoutRef.current)
            cueDragResetTimeoutRef.current = null
        }
        justDraggedRef.current = false
        setDragState({
            cueId: cue.id,
            trackId,
            type,
            startX: e.clientX,
            startY: e.clientY,
            startMinute: cue.startMin,
            startDuration: cue.durationMin,
        })
    }, [disableTouchInteractions])

    return { dragState, justDraggedRef, startCueDrag }
}
