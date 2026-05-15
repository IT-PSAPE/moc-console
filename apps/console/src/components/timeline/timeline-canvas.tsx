import { useCallback, useRef } from 'react'
import type { Cue, CueType } from '@moc/types/cue-sheet'
import { resolveTrackColor } from '@moc/types/cue-sheet'
import { useTimeline } from './timeline-context'
import { TRACK_HEIGHT, TIME_RULER_HEIGHT, TIMELINE_HORIZONTAL_PADDING, CUE_TYPE_CONFIG, formatTimeDisplay, getMarkerInterval, buildTimeMarkers } from './timeline-types'
import { X, Music, Wrench, Monitor, Megaphone, ArrowRightLeft } from 'lucide-react'

// ─── Cue type → Lucide icon ───────────────────────────────────────

const CUE_TYPE_ICONS: Record<CueType, React.ReactNode> = {
    performance: <Music className="size-3" />,
    technical: <Wrench className="size-3" />,
    equipment: <Monitor className="size-3" />,
    announcement: <Megaphone className="size-3" />,
    transition: <ArrowRightLeft className="size-3" />,
}

// ─── Canvas ────────────────────────────────────────────────────────

export function TimelineCanvas() {
    const {
        tracks, totalMinutes, filter, readOnly,
        pixelsPerMinute, effectiveZoom, currentTimeMinutes,
        setCurrentTimeMinutes, handlePlayheadPointerDown,
        startCueDrag, justDraggedRef, cueDragState,
        onTimelineContainerRef, timelineContainerRef, trackRowsRef,
        onTrackClick, onCueClick, deleteCue,
    } = useTimeline()

    const lastPointerTypeRef = useRef('')

    const markerInterval = getMarkerInterval(effectiveZoom, totalMinutes)
    const timeMarkers = buildTimeMarkers(totalMinutes, markerInterval)
    const timelineWidth = totalMinutes * pixelsPerMinute + 2 * TIMELINE_HORIZONTAL_PADDING
    const playheadLeft = Math.round(currentTimeMinutes * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING)

    // Find cue being dragged for the drop indicator
    const draggedCue = cueDragState?.type === 'move'
        ? (() => {
            for (const t of tracks) {
                const c = t.cues.find((cue) => cue.id === cueDragState.cueId)
                if (c) return { cue: c, trackId: t.id }
            }
            return null
        })()
        : null

    const handleTimeRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return
        if (!timelineContainerRef.current) return
        const rect = timelineContainerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left + timelineContainerRef.current.scrollLeft - TIMELINE_HORIZONTAL_PADDING
        setCurrentTimeMinutes(Math.max(0, Math.min(totalMinutes, x / pixelsPerMinute)))
    }, [timelineContainerRef, setCurrentTimeMinutes, totalMinutes, pixelsPerMinute, readOnly])

    const handleTrackRowClick = useCallback((trackId: string, e: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return
        if (!timelineContainerRef.current) return
        const rect = timelineContainerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left + timelineContainerRef.current.scrollLeft - TIMELINE_HORIZONTAL_PADDING
        const startMinute = Math.floor(x / pixelsPerMinute)
        onTrackClick(trackId, startMinute)
    }, [timelineContainerRef, pixelsPerMinute, onTrackClick, readOnly])

    const handleCueClick = useCallback((e: React.MouseEvent, cue: Cue, trackId: string) => {
        e.stopPropagation()
        if (!justDraggedRef.current) {
            onCueClick(cue, trackId)
        }
    }, [justDraggedRef, onCueClick])

    return (
        <div
            ref={onTimelineContainerRef}
            className="min-h-0 flex-1 overflow-auto touch-auto overscroll-contain"
        >
            <div style={{ width: timelineWidth, minWidth: '100%' }} ref={trackRowsRef} className="relative min-h-full overflow-x-clip">
                {/* Time ruler */}
                <div
                    className="sticky top-0 z-10 border-b border-secondary relative bg-secondary_alt select-none cursor-pointer"
                    style={{ height: TIME_RULER_HEIGHT }}
                    onClick={handleTimeRulerClick}
                >
                    {timeMarkers.map((minute, idx) => {
                        const isFirst = idx === 0
                        const isLast = idx === timeMarkers.length - 1
                        const labelTransform = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'

                        return (
                            <div key={minute} className="absolute top-0 bottom-0" style={{ left: minute * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING }}>
                                <div className="absolute bottom-4 w-px h-3 bg-tertiary -translate-x-1/2" />
                                <span
                                    className="absolute bottom-1 text-[10px] text-quaternary whitespace-nowrap px-1"
                                    style={{ transform: labelTransform }}
                                >
                                    {formatTimeDisplay(minute)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Track rows */}
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        data-track-id={track.id}
                        className={`border-b border-secondary relative ${readOnly ? '' : 'cursor-crosshair'}`}
                        style={{ height: TRACK_HEIGHT }}
                        onPointerDown={(e) => { lastPointerTypeRef.current = e.pointerType }}
                        onClick={(e) => {
                            if (lastPointerTypeRef.current === 'touch') return
                            handleTrackRowClick(track.id, e)
                        }}
                    >
                        {/* Grid dividers — visible vertical lines at each time marker */}
                        {timeMarkers.map((minute) => (
                            <div
                                key={minute}
                                className="absolute top-0 bottom-0 w-px bg-secondary"
                                style={{ left: minute * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING }}
                            />
                        ))}

                        {/* Cue blocks */}
                        {track.cues.map((cue) => {
                            const typeConfig = CUE_TYPE_CONFIG[cue.type]
                            const metaParts = [typeConfig.label, `${cue.durationMin}m`]
                            if (cue.notes) metaParts.push(cue.notes)
                            const metaText = metaParts.join(' \u2022 ')
                            const isFaded = filter !== 'all' && cue.type !== filter
                            const isBeingDragged = cueDragState?.cueId === cue.id

                            return (
                                <div
                                    key={cue.id}
                                    className={`absolute top-1 bottom-1 rounded-lg p-0.5 flex flex-col shadow-sm group select-none overflow-hidden ${readOnly ? '' : 'touch-none cursor-move'} transition-opacity ${isBeingDragged ? 'ring-2 ring-white/50 z-10' : ''}`}
                                    style={{
                                        left: cue.startMin * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING,
                                        width: Math.max(cue.durationMin * pixelsPerMinute, 24),
                                        backgroundColor: resolveTrackColor(track.colorKey),
                                        opacity: isFaded ? 0.25 : 1,
                                    }}
                                    onClick={(e) => handleCueClick(e, cue, track.id)}
                                    onPointerDown={readOnly ? undefined : (e) => startCueDrag(e, cue, track.id, 'move')}
                                >
                                    {/* Left resize handle */}
                                    {!readOnly && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg z-10 touch-none cursor-ew-resize hover:bg-black/10"
                                            onPointerDown={(e) => startCueDrag(e, cue, track.id, 'resize-left')}
                                        />
                                    )}

                                    {/* Meta row */}
                                    <div className="flex items-center px-1.5 py-0.5 min-w-0 gap-1">
                                        <p className="text-[11px] leading-tight text-white/80 truncate flex-1 pointer-events-none">
                                            {metaText}
                                        </p>
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteCue(track.id, cue.id)
                                                }}
                                                title="Delete cue"
                                            >
                                                <X className="size-2.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Title area */}
                                    <div className="flex-1 bg-black/20 rounded-md px-1.5 py-1.5 min-w-0 pointer-events-none flex items-center gap-1.5 overflow-hidden">
                                        <span className="text-white/90 shrink-0 drop-shadow-sm">
                                            {CUE_TYPE_ICONS[cue.type]}
                                        </span>
                                        <span className="text-[13px] font-semibold text-white truncate drop-shadow-sm">{cue.label}</span>
                                    </div>

                                    {/* Right resize handle */}
                                    {!readOnly && (
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-2 rounded-r-lg z-10 touch-none cursor-ew-resize hover:bg-black/10"
                                            onPointerDown={(e) => startCueDrag(e, cue, track.id, 'resize-right')}
                                        />
                                    )}
                                </div>
                            )
                        })}

                        {/* Drop indicator — shows where cue will land during drag */}
                        {draggedCue && draggedCue.trackId === track.id && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-brand z-20 pointer-events-none"
                                style={{ left: draggedCue.cue.startMin * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING }}
                            />
                        )}
                    </div>
                ))}

                {/* Empty row for add track */}
                {!readOnly && (
                    <div className="border-b border-secondary/50 relative" style={{ height: TRACK_HEIGHT }}>
                        {timeMarkers.map((minute) => (
                            <div
                                key={minute}
                                className="absolute top-0 bottom-0 w-px bg-secondary/50"
                                style={{ left: minute * pixelsPerMinute + TIMELINE_HORIZONTAL_PADDING }}
                            />
                        ))}
                    </div>
                )}

                {/* Playhead line */}
                <div
                    className="absolute top-0 bottom-0 -translate-x-1/2 w-px bg-utility-green-500 pointer-events-none z-20"
                    style={{ left: playheadLeft }}
                />

                {/* Playhead handle */}
                <button
                    type="button"
                    onPointerDown={readOnly ? undefined : handlePlayheadPointerDown}
                    aria-label="Drag playhead"
                    disabled={readOnly}
                    className={`absolute top-0 z-30 h-10 w-10 -translate-x-1/2 flex items-center justify-center pb-2 text-utility-green-500 ${readOnly ? '' : 'touch-none'}`}
                    style={{ left: playheadLeft }}
                >
                    <svg height="100%" viewBox="0 0 20 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 30.306V2C0 0.89543 0.895431 0 2 0H18C19.1046 0 20 0.895429 20 2V30.306C20 30.8414 19.7853 31.3545 19.404 31.7303L11.404 39.6161C10.6253 40.3836 9.37465 40.3836 8.596 39.6161L0.595997 31.7303C0.214684 31.3545 0 30.8414 0 30.306Z" fill="currentColor" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
