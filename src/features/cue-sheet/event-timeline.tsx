import { Label, Paragraph } from '@/components/display/text'
import type { Track, Cue } from '@/types/cue-sheet'
import { resolveTrackColor } from '@/types/cue-sheet'
import { cn } from '@/utils/cn'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/controls/button'

// ─── Time helpers ───────────────────────────────────────────────────

function formatTime(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}:${String(m).padStart(2, '0')}`
}

function generateMarkers(totalMin: number) {
    const step = totalMin <= 60 ? 5 : totalMin <= 240 ? 10 : 15
    const markers: number[] = []
    for (let m = 0; m <= totalMin; m += step) {
        markers.push(m)
    }
    return markers
}

// ─── Ruler ──────────────────────────────────────────────────────────

function TimeRuler({ totalMin }: { totalMin: number }) {
    const markers = generateMarkers(totalMin)

    return (
        <div className="relative h-6 border-b border-secondary select-none">
            {markers.map((m) => {
                const pct = (m / totalMin) * 100
                return (
                    <span
                        key={m}
                        className="absolute -translate-x-1/2 paragraph-xs text-quaternary"
                        style={{ left: `${pct}%` }}
                    >
                        {formatTime(m)}
                    </span>
                )
            })}
        </div>
    )
}

// ─── Cue Block ──────────────────────────────────────────────────────

function CueBlock({ cue, trackColor, totalMin }: { cue: Cue; trackColor: string; totalMin: number }) {
    const left = (cue.startMin / totalMin) * 100
    const width = (cue.durationMin / totalMin) * 100

    return (
        <div
            className="absolute top-1 bottom-1 rounded flex items-center overflow-hidden px-1.5 group/cue"
            style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: trackColor,
                opacity: 0.85,
            }}
            title={`${cue.label} (${formatTime(cue.startMin)} - ${formatTime(cue.startMin + cue.durationMin)})`}
        >
            <span className="text-white paragraph-xs truncate font-medium leading-none">
                {cue.label}
            </span>
        </div>
    )
}

// ─── Track Row ──────────────────────────────────────────────────────

function TrackRow({ track, totalMin, onDelete }: { track: Track; totalMin: number; onDelete?: (id: string) => void }) {
    return (
        <div className="flex border-b border-secondary last:border-b-0 group/track">
            {/* Track label */}
            <div className="w-32 shrink-0 flex items-center gap-1 px-3 py-2 border-r border-secondary bg-secondary_alt">
                <Label.xs className="truncate flex-1">{track.name}</Label.xs>
                {onDelete && (
                    <button
                        type="button"
                        className="opacity-0 group-hover/track:opacity-100 transition-opacity shrink-0"
                        onClick={() => onDelete(track.id)}
                    >
                        <Trash2 className="size-3.5 text-utility-red-500" />
                    </button>
                )}
            </div>

            {/* Cue lane */}
            <div className="relative flex-1 h-10">
                {track.cues.map((cue) => (
                    <CueBlock key={cue.id} cue={cue} trackColor={resolveTrackColor(track.colorKey)} totalMin={totalMin} />
                ))}
            </div>
        </div>
    )
}

// ─── Timeline ───────────────────────────────────────────────────────

type EventTimelineProps = {
    tracks: Track[]
    totalMin: number
    onAddTrack?: () => void
    onDeleteTrack?: (id: string) => void
    className?: string
}

export function EventTimeline({ tracks, totalMin, onAddTrack, onDeleteTrack, className }: EventTimelineProps) {
    if (totalMin === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">Set the event duration to see the timeline.</Paragraph.sm>
            </div>
        )
    }

    return (
        <div className={cn('rounded-lg border border-secondary bg-primary overflow-hidden', className)}>
            {/* Ruler row */}
            <div className="flex">
                <div className="w-32 shrink-0 border-r border-secondary" />
                <div className="flex-1 relative">
                    <TimeRuler totalMin={totalMin} />
                </div>
            </div>

            {/* Track rows */}
            {tracks.map((track) => (
                <TrackRow key={track.id} track={track} totalMin={totalMin} onDelete={onDeleteTrack} />
            ))}

            {/* Empty state */}
            {tracks.length === 0 && (
                <div className="flex items-center justify-center py-8">
                    <Paragraph.sm className="text-tertiary">No tracks yet. Add a track to start building your cue sheet.</Paragraph.sm>
                </div>
            )}

            {/* Add track */}
            {onAddTrack && (
                <div className="flex border-t border-secondary">
                    <div className="w-32 shrink-0 border-r border-secondary" />
                    <div className="flex-1 px-3 py-2">
                        <Button variant="ghost" icon={<Plus />} onClick={onAddTrack}>
                            Add Track
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
