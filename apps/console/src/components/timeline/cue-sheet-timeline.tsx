import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
    Timeline as Primitive,
    useClockTransport,
    type TimelineLaneData,
} from '@moc/ui/components/timeline'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { Label } from '@moc/ui/components/display/text'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { resolveTrackColor } from '@moc/types/cue-sheet'
import type { Cue, Track } from '@moc/types/cue-sheet'
import { cn } from '@moc/utils/cn'
import { GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { CUE_TYPE_CONFIG, TRACK_COLORS } from './timeline-types'
import { CUE_TYPE_ICONS } from './cue-type-icons'
import { CueSheetToolbar } from './cue-sheet-toolbar'
import {
    CueDomainProvider,
    PlaybackSyncBridge,
    lanesToTracks,
    tracksToLanes,
    useTimeline,
    type TimelinePlaybackSync,
} from './cue-domain'

export { useTimeline, type TimelinePlaybackSync }

// ─── Sidebar lane header (track row) ───────────────────────────────

function TrackHeaderRow({ track, readOnly, canDelete }: { track: Track; readOnly: boolean; canDelete: boolean }) {
    const { updateTrack, deleteTrack } = useTimeline()
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(track.name)

    const commit = useCallback(() => {
        if (draft.trim()) updateTrack(track.id, { name: draft.trim() })
        setIsEditing(false)
    }, [draft, track.id, updateTrack])

    function handleStartRename() {
        setDraft(track.name)
        setIsEditing(true)
    }

    function handleDelete() {
        deleteTrack(track.id)
    }

    function handleDraftChange(e: React.ChangeEvent<HTMLInputElement>) {
        setDraft(e.target.value)
    }

    function handleDraftKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setIsEditing(false)
    }

    return (
        <Primitive.LaneHeader id={track.id}>
            {readOnly ? (
                <div className="shrink-0 size-5" aria-hidden />
            ) : (
                <Dropdown>
                    <Dropdown.Trigger>
                        <Primitive.LaneHeader.DragHandle className="p-0.5 text-quaternary hover:text-tertiary">
                            <GripVertical className="size-4" />
                        </Primitive.LaneHeader.DragHandle>
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={handleStartRename}>
                            <span className="flex items-center gap-2"><Pencil className="size-3.5" /> Rename</span>
                        </Dropdown.Item>
                        <div className="px-2 py-1.5">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-quaternary mb-1.5 px-0.5">Color</p>
                            <div className="grid grid-cols-4 gap-1.5">
                                {TRACK_COLORS.map((color) => (
                                    <TrackColorSwatch key={color} color={color} active={track.colorKey === color} trackId={track.id} />
                                ))}
                            </div>
                        </div>
                        {canDelete && (
                            <>
                                <Dropdown.Separator />
                                <Dropdown.Item onSelect={handleDelete}>
                                    <span className="flex items-center gap-2 text-utility-red-500"><Trash2 className="size-3.5" /> Delete</span>
                                </Dropdown.Item>
                            </>
                        )}
                    </Dropdown.Panel>
                </Dropdown>
            )}

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="size-3.5 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: resolveTrackColor(track.colorKey) }} />
                {isEditing ? (
                    <Input
                        style="ghost"
                        type="text"
                        value={draft}
                        onChange={handleDraftChange}
                        onBlur={commit}
                        onKeyDown={handleDraftKeyDown}
                        className="min-w-0 flex-1 rounded border border-secondary px-1.5 py-0.5 text-sm font-medium"
                        autoFocus
                    />
                ) : (
                    <Label.xs className="min-w-0 flex-1 truncate">{track.name}</Label.xs>
                )}
            </div>
        </Primitive.LaneHeader>
    )
}

function TrackColorSwatch({ color, active, trackId }: { color: Track['colorKey']; active: boolean; trackId: string }) {
    const { updateTrack } = useTimeline()

    function handleClick() {
        updateTrack(trackId, { colorKey: color })
    }

    return (
        <Button
            variant="ghost"
            aria-label={`Set color ${color}`}
            onClick={handleClick}
            className={cn('size-6 rounded-full !p-0 border transition-transform hover:scale-110', active ? 'border-brand ring-2 ring-brand/30' : 'border-secondary')}
            style={{ backgroundColor: resolveTrackColor(color) }}
        />
    )
}

function AddTrackRow() {
    const { addTrack, tracks } = useTimeline()
    const [adding, setAdding] = useState(false)
    const [name, setName] = useState('')

    const commit = useCallback(() => {
        if (name.trim()) addTrack(name.trim())
        setName('')
        setAdding(false)
    }, [name, addTrack])

    function handleStartAdding() {
        setAdding(true)
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value)
    }

    function handleBlur() {
        if (name.trim()) commit()
        else setAdding(false)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setName(''); setAdding(false) }
    }

    if (!adding) {
        return (
            <div className="border-b border-secondary/50 px-3 flex items-center" style={{ height: 56 }}>
                <Button
                    variant="ghost"
                    icon={<Plus />}
                    onClick={handleStartAdding}
                    className="!justify-start !border-0 !p-0 !bg-transparent text-sm text-tertiary hover:text-brand w-full"
                >
                    Add Track
                </Button>
            </div>
        )
    }
    return (
        <div className="border-b border-secondary/50 px-3 flex items-center" style={{ height: 56 }}>
            <div className="flex items-center gap-2 w-full">
                <div className="w-3 h-3 rounded-full shrink-0 bg-quaternary" />
                <Input
                    style="ghost"
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Track name..."
                    className="text-sm border border-secondary rounded px-1.5 py-0.5 w-full"
                    autoFocus
                />
                <span className="sr-only">{tracks.length}</span>
            </div>
        </div>
    )
}

// ─── Cue block content ─────────────────────────────────────────────

function CueBlock({ cue, track, readOnly, faded }: { cue: Cue; track: Track; readOnly: boolean; faded: boolean }) {
    const { openEditModal } = useTimeline()
    const meta = [CUE_TYPE_CONFIG[cue.type].label, `${cue.durationMin}m`]
    if (cue.notes) meta.push(cue.notes)

    const handleClick = readOnly ? undefined : () => openEditModal(cue, track.id)

    return (
        <Primitive.Block
            id={cue.id}
            start={cue.startMin}
            duration={cue.durationMin}
            onClick={handleClick}
            className="p-0.5"
            style={{ backgroundColor: resolveTrackColor(track.colorKey), opacity: faded ? 0.25 : 1 }}
        >
            {!readOnly && <Primitive.Block.Move />}
            {!readOnly && <Primitive.Block.ResizeStart />}
            {!readOnly && <Primitive.Block.ResizeEnd />}

            <div className="relative flex items-center px-1.5 py-0.5 min-w-0 gap-1 pointer-events-none">
                <p className="text-[11px] leading-tight text-white/80 truncate flex-1">{meta.join(' • ')}</p>
                {!readOnly && (
                    <Primitive.Block.Remove className="pointer-events-auto shrink-0 w-4 h-4 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="size-2.5" />
                    </Primitive.Block.Remove>
                )}
            </div>
            <div className="flex-1 bg-black/20 rounded-md px-1.5 py-1.5 min-w-0 pointer-events-none flex items-center gap-1.5 overflow-hidden">
                <span className="text-white/90 shrink-0 drop-shadow-sm">{CUE_TYPE_ICONS[cue.type]}</span>
                <span className="text-[13px] font-semibold text-white truncate drop-shadow-sm">{cue.label}</span>
            </div>
        </Primitive.Block>
    )
}

// ─── Root wrapper (keeps the cue-sheet's existing public API) ──────

type CueSheetTimelineProps = {
    tracks: Track[]
    totalMin: number
    onChange?: (tracks: Track[]) => void
    children?: ReactNode
    className?: string
    readOnly?: boolean
    playbackSync?: TimelinePlaybackSync | null
    initialPlayback?: { currentTimeMinutes: number; isPlaying: boolean }
}

function TimelineRoot({ tracks, totalMin, onChange, children, className, readOnly = false, playbackSync = null, initialPlayback }: CueSheetTimelineProps) {
    const lanes = useMemo(() => tracksToLanes(tracks), [tracks])
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    const isFollower = playbackSync?.role === 'follower'
    const transport = useClockTransport({ duration: totalMin, atEnd: 'stop', suppressTicker: isFollower })

    // Seed initial playback once (late-joining a live session).
    const seededRef = useRef(false)
    useEffect(() => {
        if (seededRef.current || !initialPlayback) return
        seededRef.current = true
        transport.seek(initialPlayback.currentTimeMinutes)
        transport.setPlaying(initialPlayback.isPlaying)
    }, [initialPlayback, transport])

    const handleChange = useCallback((nextLanes: TimelineLaneData[]) => {
        onChangeRef.current?.(lanesToTracks(nextLanes))
    }, [])

    if (totalMin === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="paragraph-sm text-tertiary">Set the event duration to see the timeline.</p>
            </div>
        )
    }

    const canDelete = tracks.length > 1

    return (
        <Primitive lanes={lanes} total={totalMin} transport={transport} onChange={readOnly ? undefined : handleChange} className={className}>
            <CueDomainProvider tracks={tracks} readOnly={readOnly} playbackSync={playbackSync}>
                {playbackSync && <PlaybackSyncBridge sync={playbackSync} />}
                {children}

                <Primitive.Viewport>
                    <Primitive.Sidebar>
                        <Primitive.SidebarHeader>
                            <Primitive.Toolbar.PlayToggle />
                            <Primitive.Toolbar.Clock className="flex-1" />
                        </Primitive.SidebarHeader>
                        <Primitive.LaneList>
                            {tracks.map((track) => (
                                <TrackHeaderRow key={track.id} track={track} readOnly={readOnly} canDelete={canDelete} />
                            ))}
                            {!readOnly && <AddTrackRow />}
                        </Primitive.LaneList>
                    </Primitive.Sidebar>

                    <Primitive.Canvas>
                        <Primitive.Ruler />
                        {tracks.map((track) => (
                            <CueLane key={track.id} track={track} readOnly={readOnly} />
                        ))}
                        {readOnly ? <Primitive.PlayheadMarker /> : <Primitive.Playhead />}
                    </Primitive.Canvas>
                </Primitive.Viewport>
            </CueDomainProvider>
        </Primitive>
    )
}

function CueLane({ track, readOnly }: { track: Track; readOnly: boolean }) {
    const { openCreateModal, filter } = useTimeline()

    function handleClickAt(start: number) {
        openCreateModal(track.id, start)
    }

    return (
        <Primitive.Lane id={track.id} onClickAt={readOnly ? undefined : handleClickAt}>
            {track.cues.map((cue) => (
                <CueBlock key={cue.id} cue={cue} track={track} readOnly={readOnly} faded={filter !== 'all' && cue.type !== filter} />
            ))}
        </Primitive.Lane>
    )
}

export const Timeline = Object.assign(TimelineRoot, {
    Toolbar: CueSheetToolbar,
})
