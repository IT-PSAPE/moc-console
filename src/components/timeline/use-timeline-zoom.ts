import { useCallback, useEffect, useRef, useState } from 'react'
import { MIN_ZOOM, MAX_EFFECTIVE_ZOOM, ZOOM_FACTOR, BASE_PIXELS_PER_MINUTE, TIMELINE_HORIZONTAL_PADDING } from './timeline-types'

interface UseTimelineZoomOptions {
    totalMinutes: number
    timelineContainer: HTMLDivElement | null
    currentTimeMinutesRef: React.RefObject<number>
    onPinchStateChange?: (isActive: boolean) => void
}

export function useTimelineZoom({ totalMinutes, timelineContainer, currentTimeMinutesRef, onPinchStateChange }: UseTimelineZoomOptions) {
    const [zoom, setZoom] = useState(1)
    const [containerWidth, setContainerWidth] = useState(0)

    const usableWidth = Math.max(0, containerWidth - 2 * TIMELINE_HORIZONTAL_PADDING)
    const fitZoom = usableWidth > 0 ? usableWidth / (totalMinutes * BASE_PIXELS_PER_MINUTE) : 1
    const maxZoom = Math.max(MIN_ZOOM, MAX_EFFECTIVE_ZOOM / fitZoom)
    const clampedZoom = Math.min(maxZoom, Math.max(MIN_ZOOM, zoom))
    const effectiveZoom = fitZoom * clampedZoom
    const pixelsPerMinute = BASE_PIXELS_PER_MINUTE * effectiveZoom

    const fitZoomRef = useRef(fitZoom)
    fitZoomRef.current = fitZoom
    const maxZoomRef = useRef(maxZoom)
    maxZoomRef.current = maxZoom
    const currentZoomRef = useRef(clampedZoom)
    const pinchLastDistanceRef = useRef<number | null>(null)
    const activeTouchPointsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())

    useEffect(() => {
        currentZoomRef.current = clampedZoom
    }, [clampedZoom])

    // Track container width
    useEffect(() => {
        if (!timelineContainer) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width)
            }
        })
        observer.observe(timelineContainer)
        setContainerWidth(timelineContainer.clientWidth)
        return () => observer.disconnect()
    }, [timelineContainer])

    const updateZoomAnchoredToPlayhead = useCallback((direction: 'in' | 'out') => {
        if (!timelineContainer) return
        const scrollLeftBeforeZoom = timelineContainer.scrollLeft
        const time = currentTimeMinutesRef.current

        setZoom((z) => {
            const currentZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, z))
            const currentEffectiveZoom = fitZoomRef.current * currentZoom
            const playheadViewportX = time * BASE_PIXELS_PER_MINUTE * currentEffectiveZoom - scrollLeftBeforeZoom

            const nextRawZoom = direction === 'in' ? currentZoom * ZOOM_FACTOR : currentZoom / ZOOM_FACTOR
            const clampedRawZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, nextRawZoom))
            const nextEffectiveZoom = fitZoomRef.current * clampedRawZoom

            requestAnimationFrame(() => {
                const playheadTimelineXAfterZoom = time * BASE_PIXELS_PER_MINUTE * nextEffectiveZoom
                const targetScrollLeft = playheadTimelineXAfterZoom - playheadViewportX
                const maxScrollLeft = Math.max(0, timelineContainer.scrollWidth - timelineContainer.clientWidth)
                timelineContainer.scrollLeft = Math.min(maxScrollLeft, Math.max(0, targetScrollLeft))
            })

            return clampedRawZoom
        })
    }, [timelineContainer, currentTimeMinutesRef])

    const setZoomAnchoredToPlayhead = useCallback((nextRawZoom: number) => {
        if (!timelineContainer) return
        const scrollLeftBeforeZoom = timelineContainer.scrollLeft
        const time = currentTimeMinutesRef.current

        setZoom((z) => {
            const currentZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, z))
            const currentEffectiveZoom = fitZoomRef.current * currentZoom
            const playheadViewportX = time * BASE_PIXELS_PER_MINUTE * currentEffectiveZoom - scrollLeftBeforeZoom
            const clampedRawZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, nextRawZoom))
            const nextEffectiveZoom = fitZoomRef.current * clampedRawZoom

            requestAnimationFrame(() => {
                const playheadTimelineXAfterZoom = time * BASE_PIXELS_PER_MINUTE * nextEffectiveZoom
                const targetScrollLeft = playheadTimelineXAfterZoom - playheadViewportX
                const maxScrollLeft = Math.max(0, timelineContainer.scrollWidth - timelineContainer.clientWidth)
                timelineContainer.scrollLeft = Math.min(maxScrollLeft, Math.max(0, targetScrollLeft))
            })

            return clampedRawZoom
        })
    }, [timelineContainer, currentTimeMinutesRef])

    // Wheel: Ctrl/Cmd+scroll = zoom, Shift+scroll = horizontal pan
    useEffect(() => {
        if (!timelineContainer) return
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                updateZoomAnchoredToPlayhead(e.deltaY > 0 ? 'out' : 'in')
            } else if (e.shiftKey) {
                e.preventDefault()
                timelineContainer.scrollLeft += e.deltaY
            }
        }
        timelineContainer.addEventListener('wheel', handleWheel, { passive: false })
        return () => timelineContainer.removeEventListener('wheel', handleWheel)
    }, [updateZoomAnchoredToPlayhead, timelineContainer])

    // Pinch-to-zoom
    useEffect(() => {
        if (!timelineContainer) return
        const container = timelineContainer
        const activeTouchPoints = activeTouchPointsRef.current

        const getDistance = () => {
            const points = Array.from(activeTouchPoints.values())
            if (points.length < 2) return null
            const [first, second] = points
            return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
        }

        const resetPinch = () => {
            pinchLastDistanceRef.current = null
            onPinchStateChange?.(false)
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return
            activeTouchPoints.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
            if (activeTouchPoints.size === 2) {
                pinchLastDistanceRef.current = getDistance()
                onPinchStateChange?.(true)
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return
            if (!activeTouchPoints.has(event.pointerId)) return
            activeTouchPoints.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
            if (activeTouchPoints.size < 2) return
            const previousDistance = pinchLastDistanceRef.current
            const currentDistance = getDistance()
            if (!previousDistance || !currentDistance) return
            if (previousDistance < 8) return
            const distanceRatio = currentDistance / previousDistance
            const nextZoom = currentZoomRef.current * distanceRatio
            setZoomAnchoredToPlayhead(nextZoom)
            pinchLastDistanceRef.current = currentDistance
            event.preventDefault()
        }

        const handlePointerUpOrCancel = (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return
            activeTouchPoints.delete(event.pointerId)
            if (activeTouchPoints.size < 2) {
                resetPinch()
            } else {
                pinchLastDistanceRef.current = getDistance()
            }
        }

        const touchStyle = container.style
        const previousTouchAction = touchStyle.touchAction
        touchStyle.setProperty('touch-action', 'pan-x pan-y')

        container.addEventListener('pointerdown', handlePointerDown)
        container.addEventListener('pointermove', handlePointerMove, { passive: false })
        container.addEventListener('pointerup', handlePointerUpOrCancel)
        container.addEventListener('pointercancel', handlePointerUpOrCancel)
        container.addEventListener('pointerleave', handlePointerUpOrCancel)

        return () => {
            if (previousTouchAction) {
                touchStyle.setProperty('touch-action', previousTouchAction)
            } else {
                touchStyle.removeProperty('touch-action')
            }
            container.removeEventListener('pointerdown', handlePointerDown)
            container.removeEventListener('pointermove', handlePointerMove)
            container.removeEventListener('pointerup', handlePointerUpOrCancel)
            container.removeEventListener('pointercancel', handlePointerUpOrCancel)
            container.removeEventListener('pointerleave', handlePointerUpOrCancel)
            activeTouchPoints.clear()
            resetPinch()
        }
    }, [onPinchStateChange, setZoomAnchoredToPlayhead, timelineContainer])

    return { zoom, clampedZoom, fitZoom, maxZoom, effectiveZoom, pixelsPerMinute, containerWidth, updateZoomAnchoredToPlayhead, setZoomAnchoredToPlayhead }
}
