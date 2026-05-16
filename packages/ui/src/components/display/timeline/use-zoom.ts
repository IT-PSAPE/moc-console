import { useCallback, useEffect, useRef, useState } from 'react'
import { MIN_ZOOM, MAX_EFFECTIVE_ZOOM, ZOOM_FACTOR, BASE_PIXELS_PER_UNIT, TIMELINE_HORIZONTAL_PADDING } from './types'

interface UseZoomOptions {
    total: number
    container: HTMLDivElement | null
    currentTimeRef: React.RefObject<number>
    onPinchStateChange?: (isActive: boolean) => void
}

export function useZoom({ total, container, currentTimeRef, onPinchStateChange }: UseZoomOptions) {
    const [zoom, setZoom] = useState(1)
    const [containerWidth, setContainerWidth] = useState(0)

    const usableWidth = Math.max(0, containerWidth - 2 * TIMELINE_HORIZONTAL_PADDING)
    const fitZoom = usableWidth > 0 && total > 0 ? usableWidth / (total * BASE_PIXELS_PER_UNIT) : 1
    const maxZoom = Math.max(MIN_ZOOM, MAX_EFFECTIVE_ZOOM / fitZoom)
    const clampedZoom = Math.min(maxZoom, Math.max(MIN_ZOOM, zoom))
    const effectiveZoom = fitZoom * clampedZoom
    const pixelsPerUnit = BASE_PIXELS_PER_UNIT * effectiveZoom

    const fitZoomRef = useRef(fitZoom)
    const maxZoomRef = useRef(maxZoom)
    const currentZoomRef = useRef(clampedZoom)
    const pinchLastDistanceRef = useRef<number | null>(null)
    const activeTouchPointsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())

    useEffect(() => { fitZoomRef.current = fitZoom }, [fitZoom])
    useEffect(() => { maxZoomRef.current = maxZoom }, [maxZoom])
    useEffect(() => { currentZoomRef.current = clampedZoom }, [clampedZoom])

    useEffect(() => {
        if (!container) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width)
        })
        observer.observe(container)
        const frameId = window.requestAnimationFrame(() => setContainerWidth(container.clientWidth))
        return () => {
            window.cancelAnimationFrame(frameId)
            observer.disconnect()
        }
    }, [container])

    const setZoomAnchoredToPlayhead = useCallback((nextRawZoom: number) => {
        if (!container) return
        const scrollLeftBeforeZoom = container.scrollLeft
        const time = currentTimeRef.current

        setZoom((z) => {
            const currentZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, z))
            const currentEffectiveZoom = fitZoomRef.current * currentZoom
            const playheadViewportX = time * BASE_PIXELS_PER_UNIT * currentEffectiveZoom - scrollLeftBeforeZoom
            const clampedRawZoom = Math.min(maxZoomRef.current, Math.max(MIN_ZOOM, nextRawZoom))
            const nextEffectiveZoom = fitZoomRef.current * clampedRawZoom

            requestAnimationFrame(() => {
                const playheadTimelineXAfterZoom = time * BASE_PIXELS_PER_UNIT * nextEffectiveZoom
                const targetScrollLeft = playheadTimelineXAfterZoom - playheadViewportX
                const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
                container.scrollLeft = Math.min(maxScrollLeft, Math.max(0, targetScrollLeft))
            })

            return clampedRawZoom
        })
    }, [container, currentTimeRef])

    const updateZoomAnchoredToPlayhead = useCallback((direction: 'in' | 'out') => {
        setZoomAnchoredToPlayhead(
            direction === 'in'
                ? currentZoomRef.current * ZOOM_FACTOR
                : currentZoomRef.current / ZOOM_FACTOR,
        )
    }, [setZoomAnchoredToPlayhead])

    // Wheel: Ctrl/Cmd+scroll = zoom, Shift+scroll = horizontal pan
    useEffect(() => {
        if (!container) return
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                updateZoomAnchoredToPlayhead(e.deltaY > 0 ? 'out' : 'in')
            } else if (e.shiftKey) {
                e.preventDefault()
                container.scrollLeft += e.deltaY
            }
        }
        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [updateZoomAnchoredToPlayhead, container])

    // Pinch-to-zoom
    useEffect(() => {
        if (!container) return
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
            setZoomAnchoredToPlayhead(currentZoomRef.current * distanceRatio)
            pinchLastDistanceRef.current = currentDistance
            event.preventDefault()
        }
        const handlePointerUpOrCancel = (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return
            activeTouchPoints.delete(event.pointerId)
            if (activeTouchPoints.size < 2) resetPinch()
            else pinchLastDistanceRef.current = getDistance()
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
            if (previousTouchAction) touchStyle.setProperty('touch-action', previousTouchAction)
            else touchStyle.removeProperty('touch-action')
            container.removeEventListener('pointerdown', handlePointerDown)
            container.removeEventListener('pointermove', handlePointerMove)
            container.removeEventListener('pointerup', handlePointerUpOrCancel)
            container.removeEventListener('pointercancel', handlePointerUpOrCancel)
            container.removeEventListener('pointerleave', handlePointerUpOrCancel)
            activeTouchPoints.clear()
            resetPinch()
        }
    }, [onPinchStateChange, setZoomAnchoredToPlayhead, container])

    return { effectiveZoom, pixelsPerUnit, containerWidth, updateZoomAnchoredToPlayhead }
}
