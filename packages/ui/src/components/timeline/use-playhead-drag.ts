import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYHEAD_DRAG_EDGE_THRESHOLD_RATIO, PLAYHEAD_DRAG_MIN_EDGE_THRESHOLD_PX, TIMELINE_HORIZONTAL_PADDING } from './timeline-types'

interface UsePlayheadDragOptions {
    pixelsPerMinute: number
    totalMinutes: number
    timelineContainerRef: React.RefObject<HTMLDivElement | null>
    setCurrentTimeMinutes: React.Dispatch<React.SetStateAction<number>>
    isDraggingPlayheadRef: React.RefObject<boolean>
    disableTouchInteractions: boolean
}

export function usePlayheadDrag({ pixelsPerMinute, totalMinutes, timelineContainerRef, setCurrentTimeMinutes, isDraggingPlayheadRef, disableTouchInteractions }: UsePlayheadDragOptions) {
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
    const playheadPointerClientXRef = useRef<number | null>(null)
    const playheadDragRafRef = useRef<number | null>(null)

    useEffect(() => {
        isDraggingPlayheadRef.current = isDraggingPlayhead
    }, [isDraggingPlayhead, isDraggingPlayheadRef])

    const updatePlayheadFromPointer = useCallback((clientX: number) => {
        const container = timelineContainerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const viewportWidth = rect.width
        if (viewportWidth <= 0) return

        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)

        // Only apply edge-based auto-scrolling when there's meaningful scroll range
        if (maxScrollLeft > 1) {
            const edgeThreshold = Math.max(PLAYHEAD_DRAG_MIN_EDGE_THRESHOLD_PX, viewportWidth * PLAYHEAD_DRAG_EDGE_THRESHOLD_RATIO)
            const pointerViewportXRaw = clientX - rect.left
            let nextScrollLeft = container.scrollLeft

            const leftEdgeLimit = edgeThreshold
            const rightEdgeLimit = viewportWidth - edgeThreshold

            if (pointerViewportXRaw < leftEdgeLimit && nextScrollLeft > 0) {
                nextScrollLeft = Math.max(0, nextScrollLeft - (leftEdgeLimit - pointerViewportXRaw))
            } else if (pointerViewportXRaw > rightEdgeLimit && nextScrollLeft < maxScrollLeft) {
                nextScrollLeft = Math.min(maxScrollLeft, nextScrollLeft + (pointerViewportXRaw - rightEdgeLimit))
            }

            if (nextScrollLeft !== container.scrollLeft) {
                container.scrollLeft = nextScrollLeft
            }
        }

        // Calculate time from pointer position — always works regardless of scroll
        const pointerViewportX = clientX - rect.left
        const timelineX = container.scrollLeft + pointerViewportX
        const newTime = Math.max(0, Math.min(totalMinutes, (timelineX - TIMELINE_HORIZONTAL_PADDING) / pixelsPerMinute))

        setCurrentTimeMinutes((prevTime) => (Math.abs(prevTime - newTime) < 0.0001 ? prevTime : newTime))
    }, [pixelsPerMinute, totalMinutes, timelineContainerRef, setCurrentTimeMinutes])

    const handlePlayheadPointerDown = useCallback((e: React.PointerEvent) => {
        if (disableTouchInteractions && e.pointerType === 'touch') return
        e.preventDefault()
        e.stopPropagation()
        ;(e.target as Element).setPointerCapture(e.pointerId)
        playheadPointerClientXRef.current = e.clientX
        updatePlayheadFromPointer(e.clientX)
        setIsDraggingPlayhead(true)
    }, [disableTouchInteractions, updatePlayheadFromPointer])

    const handlePlayheadMove = useCallback((e: PointerEvent) => {
        if (!isDraggingPlayhead) return
        playheadPointerClientXRef.current = e.clientX
    }, [isDraggingPlayhead])

    const handlePlayheadUp = useCallback(() => {
        setIsDraggingPlayhead(false)
        playheadPointerClientXRef.current = null
    }, [])

    useEffect(() => {
        if (!disableTouchInteractions) return

        const frameId = window.requestAnimationFrame(() => {
            setIsDraggingPlayhead(false)
            playheadPointerClientXRef.current = null
        })

        return () => {
            window.cancelAnimationFrame(frameId)
        }
    }, [disableTouchInteractions])

    useEffect(() => {
        if (isDraggingPlayhead) {
            window.addEventListener('pointermove', handlePlayheadMove)
            window.addEventListener('pointerup', handlePlayheadUp)

            const updateFrame = () => {
                const clientX = playheadPointerClientXRef.current
                if (clientX !== null) {
                    updatePlayheadFromPointer(clientX)
                }
                playheadDragRafRef.current = requestAnimationFrame(updateFrame)
            }

            playheadDragRafRef.current = requestAnimationFrame(updateFrame)

            return () => {
                window.removeEventListener('pointermove', handlePlayheadMove)
                window.removeEventListener('pointerup', handlePlayheadUp)
                if (playheadDragRafRef.current !== null) {
                    cancelAnimationFrame(playheadDragRafRef.current)
                    playheadDragRafRef.current = null
                }
            }
        }
    }, [isDraggingPlayhead, handlePlayheadMove, handlePlayheadUp, updatePlayheadFromPointer])

    return { isDraggingPlayhead, handlePlayheadPointerDown }
}
