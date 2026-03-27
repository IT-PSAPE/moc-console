import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Track } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

const TRACK_COLORS = [
  '#FF1493', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#EF4444', '#84CC16', '#0EA5E9',
]

interface TrackFormProps {
  open: boolean
  onClose: () => void
  eventId: string
  editingTrack: Track | null
  dispatch: Dispatch<CueSheetAction>
}

interface FormState {
  name: string
  color: string
}

function makeInitial(track: Track | null): FormState {
  if (track) return { name: track.name, color: track.color }
  return { name: '', color: TRACK_COLORS[0] }
}

export function TrackForm({ open, onClose, eventId, editingTrack, dispatch }: TrackFormProps) {
  const [form, setForm] = useState<FormState>(() => makeInitial(editingTrack))

  function handleClose() {
    onClose()
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, name: e.target.value }))
  }

  function handleColorSelect(color: string) {
    setForm((f) => ({ ...f, color }))
  }

  function handleSubmit() {
    if (editingTrack) {
      dispatch({ type: 'UPDATE_TRACK', eventId, trackId: editingTrack.id, changes: form })
    } else {
      dispatch({ type: 'ADD_TRACK', eventId, track: form })
    }
    handleClose()
  }

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>{editingTrack ? 'Edit Track' : 'Add Track'}</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <Input label="Track Name" id="track-name" placeholder="e.g. Main Stage" value={form.name} onChange={handleNameChange} />
          <div>
            <p className="mb-2 text-sm text-text-tertiary">Colour</p>
            <div className="flex flex-wrap gap-2">
              {TRACK_COLORS.map((color) => (
                <button
                  key={color}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === color ? 'border-text-primary scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Select colour ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border-secondary bg-background-secondary px-3 py-2">
            <div className="h-4 w-1 rounded-full" style={{ backgroundColor: form.color }} />
            <span className="text-sm text-text-primary">{form.name || 'Track preview'}</span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!form.name.trim()}>
          {editingTrack ? 'Save Changes' : 'Add Track'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
