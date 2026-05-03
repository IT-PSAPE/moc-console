import { useCallback, useState } from 'react'
import { Label } from '@/components/display/text'
import { Dropdown } from '@/components/overlays/dropdown'
import { GripVertical, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useTimeline } from './timeline-context'
import { TRACK_HEIGHT, TIME_RULER_HEIGHT, SIDEBAR_WIDTH, TRACK_COLORS, formatTimeDisplay } from './timeline-types'
import { resolveTrackColor } from '@/types/cue-sheet'

export function TimelineSidebar() {
    const {
        tracks, totalMinutes, readOnly,
        currentTimeMinutes, isPlaying, handlePlayPause,
        addTrack, deleteTrack, updateTrack,
        trackDragState, handleTrackDragStart,
    } = useTimeline()

    const [isAddingTrack, setIsAddingTrack] = useState(false)
    const [newTrackName, setNewTrackName] = useState('')
    const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
    const [editingTrackName, setEditingTrackName] = useState('')
    const canDeleteTracks = tracks.length > 1

        const handleAddTrackInline = useCallback(() => {
        if (!newTrackName.trim()) return
        const colorIndex = tracks.length % TRACK_COLORS.length
        addTrack(newTrackName.trim(), TRACK_COLORS[colorIndex])
        setNewTrackName('')
        setIsAddingTrack(false)
    }, [newTrackName, tracks.length, addTrack])

    const handleStartRename = useCallback((trackId: string, name: string) => {
        setEditingTrackId(trackId)
        setEditingTrackName(name)
    }, [])

    const handleCommitRename = useCallback((trackId: string) => {
        if (editingTrackName.trim()) {
            updateTrack(trackId, { name: editingTrackName.trim() })
        }
        setEditingTrackId(null)
        setEditingTrackName('')
    }, [editingTrackName, updateTrack])

    return (
        <div className="flex min-h-0 shrink-0 flex-col border-r border-secondary bg-secondary_alt" style={{ width: SIDEBAR_WIDTH }}>
            {/* Play/pause header */}
            <div className="border-b border-secondary px-2.5 flex items-center gap-1.5" style={{ height: TIME_RULER_HEIGHT }}>
                <button
                    type="button"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-primary_hover transition-colors"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </button>
                <span className="whitespace-nowrap text-center text-[10px] leading-none font-mono font-medium text-secondary tabular-nums flex-1">
                    {formatTimeDisplay(currentTimeMinutes)} / {formatTimeDisplay(totalMinutes)}
                </span>
            </div>

            {/* Track list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {tracks.map((track, index) => {
                    const isDragSource = trackDragState?.trackId === track.id
                    const isDragTarget = trackDragState !== null && trackDragState.trackId !== track.id && trackDragState.currentIndex === index
                    const isEditing = editingTrackId === track.id

                    return (
                        <div
                            key={track.id}
                            data-track-sidebar
                            className={`relative flex items-center gap-1.5 border-b border-secondary px-1.5 transition-colors ${isDragSource ? 'bg-brand/5' : ''}`}
                            style={{ height: TRACK_HEIGHT }}
                        >
                            {/* Drop target indicator */}
                            {isDragTarget && (
                                <div className="absolute inset-x-0 top-0 h-0 z-10 flex items-center justify-center">
                                    <div className="w-full h-0.5 bg-brand shadow-sm" />
                                </div>
                            )}

                            {/* Drag handle with dropdown — hidden in read-only mode */}
                            {readOnly ? (
                                <div className="shrink-0 size-5" aria-hidden />
                            ) : (
                            <Dropdown.Root>
                                <Dropdown.Trigger>
                                    <div
                                        className="shrink-0 p-0.5 text-quaternary hover:text-tertiary cursor-grab active:cursor-grabbing touch-none"
                                        onPointerDown={(e) => {
                                            // Start tracking for drag — dropdown only opens on click (no drag)
                                            handleTrackDragStart(track.id, index, e)
                                        }}
                                    >
                                        <GripVertical className="size-4" />
                                    </div>
                                </Dropdown.Trigger>
                                <Dropdown.Panel>
                                    <Dropdown.Item onSelect={() => handleStartRename(track.id, track.name)}>
                                        <span className="flex items-center gap-2">
                                            <Pencil className="size-3.5" />
                                            Rename
                                        </span>
                                    </Dropdown.Item>
                                    {/* Color picker */}
                                    <div className="px-2 py-1.5">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-quaternary mb-1.5 px-0.5">Color</p>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {TRACK_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`size-6 rounded-full border transition-transform hover:scale-110 ${track.colorKey === color ? 'border-brand ring-2 ring-brand/30' : 'border-secondary'}`}
                                                    style={{ backgroundColor: resolveTrackColor(color) }}
                                                    onClick={() => updateTrack(track.id, { colorKey: color })}
                                                    aria-label={`Set color ${color}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {canDeleteTracks && (
                                        <>
                                            <Dropdown.Separator />
                                            <Dropdown.Item onSelect={() => deleteTrack(track.id)}>
                                                <span className="flex items-center gap-2 text-utility-red-500">
                                                    <Trash2 className="size-3.5" />
                                                    Delete
                                                </span>
                                            </Dropdown.Item>
                                        </>
                                    )}
                                </Dropdown.Panel>
                            </Dropdown.Root>
                            )}

                            {/* Track info */}
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                <div
                                    className="size-3.5 shrink-0 rounded-full border border-black/20"
                                    style={{ backgroundColor: resolveTrackColor(track.colorKey) }}
                                />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editingTrackName}
                                        onChange={(e) => setEditingTrackName(e.target.value)}
                                        onBlur={() => handleCommitRename(track.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCommitRename(track.id)
                                            if (e.key === 'Escape') { setEditingTrackId(null); setEditingTrackName('') }
                                        }}
                                        className="min-w-0 flex-1 rounded border border-secondary bg-primary px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-border-brand/40"
                                        autoFocus
                                    />
                                ) : (
                                    <Label.xs className="min-w-0 flex-1 truncate">{track.name}</Label.xs>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Add track row — hidden in read-only mode */}
                {!readOnly && (
                <div className="border-b border-secondary/50 px-3 flex items-center" style={{ height: TRACK_HEIGHT }}>
                    {isAddingTrack ? (
                        <div className="flex items-center gap-2 w-full">
                            <div className="w-3 h-3 rounded-full shrink-0 bg-quaternary" />
                            <input
                                type="text"
                                value={newTrackName}
                                onChange={(e) => setNewTrackName(e.target.value)}
                                onBlur={() => {
                                    if (newTrackName.trim()) handleAddTrackInline()
                                    else setIsAddingTrack(false)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTrackInline()
                                    if (e.key === 'Escape') { setNewTrackName(''); setIsAddingTrack(false) }
                                }}
                                placeholder="Track name..."
                                className="text-sm bg-primary border border-secondary rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-border-brand/40"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsAddingTrack(true)}
                            className="flex items-center gap-2 text-sm text-tertiary hover:text-brand transition-colors w-full"
                        >
                            <Plus className="size-4" />
                            <span>Add Track</span>
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    )
}
