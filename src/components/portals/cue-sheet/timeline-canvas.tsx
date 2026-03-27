import { useState, useRef } from 'react'
import { Plus, ZoomIn, ZoomOut, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CueEvent, CueItem, Track } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

const MIN_ZOOM = 20   // px per minute
const MAX_ZOOM = 120
const DEFAULT_ZOOM = 40
const TRACK_HEIGHT = 56
const HEADER_HEIGHT = 40
const LABEL_WIDTH = 140

interface TimelineCanvasProps {
  event: CueEvent
  dispatch: Dispatch<CueSheetAction>
  onAddCue: (trackId?: string) => void
  onEditCue: (cue: CueItem) => void
  onAddTrack: () => void
  onEditTrack: (track: Track) => void
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h > 0) return `${h}h${min > 0 ? `${min}m` : ''}`
  return `${min}m`
}

interface CueBlockProps {
  cue: CueItem
  track: Track
  zoom: number
  onEdit: (cue: CueItem) => void
  onDelete: (cueId: string) => void
}

function CueBlock({ cue, track, zoom, onEdit, onDelete }: CueBlockProps) {
  const left = cue.startMinute * zoom
  const width = Math.max(cue.durationMinutes * zoom, 48)

  function handleEdit() {
    onEdit(cue)
  }

  function handleDelete() {
    onDelete(cue.id)
  }

  return (
    <div
      className="group absolute top-2 flex h-10 cursor-pointer items-center overflow-hidden rounded-lg border px-2 text-xs font-medium transition-shadow hover:shadow-md"
      style={{
        left,
        width,
        backgroundColor: `${track.color}22`,
        borderColor: `${track.color}88`,
        color: track.color,
      }}
      title={`${cue.title} — ${formatMinutes(cue.startMinute)} for ${formatMinutes(cue.durationMinutes)}`}
    >
      <span className="flex-1 truncate">{cue.title}</span>
      <div className="ml-1 hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          onClick={handleEdit}
          className="rounded p-0.5 hover:bg-white/20"
          aria-label="Edit cue"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="rounded p-0.5 hover:bg-white/20"
          aria-label="Delete cue"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

interface TrackRowProps {
  track: Track
  cues: CueItem[]
  zoom: number
  totalWidth: number
  onEdit: (cue: CueItem) => void
  onDelete: (cueId: string) => void
  onAddCue: (trackId: string) => void
  onEditTrack: (track: Track) => void
  onDeleteTrack: (trackId: string) => void
}

function TrackRow({ track, cues, zoom, totalWidth, onEdit, onDelete, onAddCue, onEditTrack, onDeleteTrack }: TrackRowProps) {
  function handleAddCue() {
    onAddCue(track.id)
  }

  function handleEditTrack() {
    onEditTrack(track)
  }

  function handleDeleteTrack() {
    onDeleteTrack(track.id)
  }

  if (track.hidden) return null

  return (
    <div className="flex" style={{ height: TRACK_HEIGHT }}>
      {/* Track label */}
      <div
        className="group flex shrink-0 items-center justify-between border-b border-r border-border-secondary bg-background-primary px-3"
        style={{ width: LABEL_WIDTH, height: TRACK_HEIGHT }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-3 w-1 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
          <span className="truncate text-xs font-medium text-text-primary">{track.name}</span>
        </div>
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button onClick={handleAddCue} className="rounded p-1 text-text-quaternary hover:bg-background-secondary hover:text-text-brand" aria-label="Add cue">
            <Plus className="h-3 w-3" />
          </button>
          <button onClick={handleEditTrack} className="rounded p-1 text-text-quaternary hover:bg-background-secondary" aria-label="Edit track">
            <Edit2 className="h-3 w-3" />
          </button>
          <button onClick={handleDeleteTrack} className="rounded p-1 text-text-quaternary hover:bg-background-secondary hover:text-utility-error-600" aria-label="Delete track">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Track lane */}
      <div
        className="relative border-b border-border-secondary bg-background-primary"
        style={{ width: totalWidth, height: TRACK_HEIGHT }}
      >
        {cues
          .filter((c) => c.trackId === track.id)
          .map((cue) => (
            <CueBlock key={cue.id} cue={cue} track={track} zoom={zoom} onEdit={onEdit} onDelete={onDelete} />
          ))}
      </div>
    </div>
  )
}

export function TimelineCanvas({ event, dispatch, onAddCue, onEditCue, onAddTrack, onEditTrack }: TimelineCanvasProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const scrollRef = useRef<HTMLDivElement>(null)

  const totalWidth = event.totalDurationMinutes * zoom
  const tickInterval = zoom >= 60 ? 5 : zoom >= 30 ? 10 : 15
  const ticks = Array.from(
    { length: Math.floor(event.totalDurationMinutes / tickInterval) + 1 },
    (_, i) => i * tickInterval,
  )

  function handleZoomIn() {
    setZoom((z) => Math.min(z + 10, MAX_ZOOM))
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(z - 10, MIN_ZOOM))
  }

  function handleDeleteCue(cueId: string) {
    dispatch({ type: 'DELETE_CUE', eventId: event.id, cueId })
  }

  function handleDeleteTrack(trackId: string) {
    dispatch({ type: 'DELETE_TRACK', eventId: event.id, trackId })
  }

  function handleAddCueForTrack(trackId: string) {
    onAddCue(trackId)
  }

  function handleAddCueNoTrack() {
    onAddCue()
  }

  return (
    <div className="rounded-xl border border-border-secondary">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border-secondary px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{event.name}</span>
          <span className="text-xs text-text-quaternary">({formatMinutes(event.totalDurationMinutes)} total)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onAddTrack}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Track
          </Button>
          <Button variant="primary" size="sm" onClick={handleAddCueNoTrack}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Cue
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border-secondary p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="rounded p-1 text-text-tertiary hover:bg-background-secondary disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2.5rem] text-center text-xs text-text-tertiary">{zoom}px/m</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="rounded p-1 text-text-tertiary hover:bg-background-secondary disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline scroll area */}
      <div className="overflow-auto" ref={scrollRef}>
        {/* Time header */}
        <div className="flex sticky top-0 z-10 bg-background-secondary" style={{ height: HEADER_HEIGHT }}>
          <div className="shrink-0 border-b border-r border-border-secondary" style={{ width: LABEL_WIDTH }} />
          <div className="relative border-b border-border-secondary" style={{ width: totalWidth }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute flex flex-col items-start"
                style={{ left: tick * zoom }}
              >
                <div className="h-2 w-px bg-border-secondary" />
                <span className="pl-1 text-[10px] text-text-quaternary">{formatMinutes(tick)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        {event.tracks.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-text-quaternary">No tracks — click "Track" to add one</p>
          </div>
        ) : (
          event.tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              cues={event.cueItems}
              zoom={zoom}
              totalWidth={totalWidth}
              onEdit={onEditCue}
              onDelete={handleDeleteCue}
              onAddCue={handleAddCueForTrack}
              onEditTrack={onEditTrack}
              onDeleteTrack={handleDeleteTrack}
            />
          ))
        )}
      </div>
    </div>
  )
}
