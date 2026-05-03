import { useCallback, useEffect, useState } from 'react'
import { PLAYBACK_TICK_MS, PLAYBACK_SPEED_MULTIPLIER, PLAYHEAD_FOLLOW_THRESHOLD_RATIO, TIMELINE_HORIZONTAL_PADDING } from './timeline-types'

interface UseTimelinePlaybackOptions {
    totalMinutes: number
    pixelsPerMinute: number
    timelineContainerRef: React.RefObject<HTMLDivElement | null>
    isDraggingPlayheadRef: React.RefObject<boolean>
    /** When true, the local ticker is suppressed — playhead position is driven entirely by external updates (followers in live sync). */
    suppressLocalTicker?: boolean
}

export function useTimelinePlayback({ totalMinutes, pixelsPerMinute, timelineContainerRef, isDraggingPlayheadRef, suppressLocalTicker }: UseTimelinePlaybackOptions) {
    const [currentTimeMinutes, setCurrentTimeMinutes] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    useEffect(() => {
        if (!isPlaying || suppressLocalTicker) return

        let lastTickAt = performance.now()
        const interval = setInterval(() => {
            const now = performance.now()
            const elapsedMs = now - lastTickAt
            lastTickAt = now
            const elapsedMinutes = (elapsedMs / 60000) * PLAYBACK_SPEED_MULTIPLIER

            setCurrentTimeMinutes((t) => {
                const next = t + elapsedMinutes
                if (next >= totalMinutes) {
                    setIsPlaying(false)
                    return totalMinutes
                }
                return next
            })
        }, PLAYBACK_TICK_MS)

        return () => clearInterval(interval)
    }, [isPlaying, totalMinutes, suppressLocalTicker])

    // Auto-follow playhead during playback
    useEffect(() => {
        const container = timelineContainerRef.current
        if (!container || !isPlaying || isDraggingPlayheadRef.current) return

        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
        if (maxScrollLeft <= 0) return

        const playheadTimelineX = currentTimeMinutes * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING
        const playheadViewportX = playheadTimelineX - container.scrollLeft
        const thresholdX = container.clientWidth * PLAYHEAD_FOLLOW_THRESHOLD_RATIO

        if (playheadViewportX < thresholdX) return

        const targetScrollLeft = Math.min(maxScrollLeft, Math.max(0, playheadTimelineX - thresholdX))
        container.scrollLeft = targetScrollLeft
    }, [currentTimeMinutes, pixelsPerMinute, isPlaying, isDraggingPlayheadRef, timelineContainerRef])

    const handlePlayPause = useCallback(() => {
        if (currentTimeMinutes >= totalMinutes) {
            setCurrentTimeMinutes(0)
        }
        setIsPlaying((p) => !p)
    }, [currentTimeMinutes, totalMinutes])

    const handleStop = useCallback(() => {
        setIsPlaying(false)
        setCurrentTimeMinutes(0)
    }, [])

    return { currentTimeMinutes, setCurrentTimeMinutes, isPlaying, setIsPlaying, handlePlayPause, handleStop }
}
