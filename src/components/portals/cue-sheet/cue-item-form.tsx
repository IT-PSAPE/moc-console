import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CueItem, CueEvent } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

const CUE_TYPES = [
  'music', 'microphone', 'users', 'star', 'transition', 'camera',
  'video', 'lightbulb', 'speaker', 'clock', 'wrench', 'check-circle',
  'alert', 'bell', 'flag',
]

interface CueItemFormProps {
  open: boolean
  onClose: () => void
  event: CueEvent
  editingCue: CueItem | null
  initialTrackId?: string
  dispatch: Dispatch<CueSheetAction>
}

interface FormState {
  title: string
  type: string
  trackId: string
  startMinute: string
  durationMinutes: string
  notes: string
}

function makeInitial(cue: CueItem | null, defaultTrackId: string): FormState {
  if (cue) {
    return {
      title: cue.title,
      type: cue.type,
      trackId: cue.trackId,
      startMinute: String(cue.startMinute),
      durationMinutes: String(cue.durationMinutes),
      notes: cue.notes,
    }
  }
  return { title: '', type: 'music', trackId: defaultTrackId, startMinute: '0', durationMinutes: '15', notes: '' }
}

export function CueItemForm({ open, onClose, event, editingCue, initialTrackId, dispatch }: CueItemFormProps) {
  const defaultTrackId = initialTrackId ?? event.tracks[0]?.id ?? ''
  const [form, setForm] = useState<FormState>(() => makeInitial(editingCue, defaultTrackId))

  function handleOpen() {
    setForm(makeInitial(editingCue, defaultTrackId))
  }

  function handleClose() {
    onClose()
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, title: e.target.value }))
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, type: e.target.value }))
  }

  function handleTrackChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, trackId: e.target.value }))
  }

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, startMinute: e.target.value }))
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, durationMinutes: e.target.value }))
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, notes: e.target.value }))
  }

  function handleSubmit() {
    const cueData = {
      title: form.title,
      type: form.type,
      trackId: form.trackId,
      startMinute: parseInt(form.startMinute, 10) || 0,
      durationMinutes: parseInt(form.durationMinutes, 10) || 15,
      notes: form.notes,
    }
    if (editingCue) {
      dispatch({ type: 'UPDATE_CUE', eventId: event.id, cueId: editingCue.id, changes: cueData })
    } else {
      dispatch({ type: 'ADD_CUE', eventId: event.id, cue: cueData })
    }
    handleClose()
  }

  const selectClass = 'h-10 w-full rounded-lg border border-border-primary bg-background-primary px-3 text-sm text-text-primary outline-none focus:border-border-brand'

  const canSubmit = form.title.trim() && form.trackId

  // Reset form when modal opens
  if (open && form.title === '' && editingCue) {
    handleOpen()
  }

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>{editingCue ? 'Edit Cue' : 'Add Cue'}</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <Input label="Title" id="cue-title" placeholder="Cue description" value={form.title} onChange={handleTitleChange} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cue-type" className="mb-1.5 block text-sm text-text-tertiary">Type</label>
              <select id="cue-type" className={selectClass} value={form.type} onChange={handleTypeChange}>
                {CUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cue-track" className="mb-1.5 block text-sm text-text-tertiary">Track</label>
              <select id="cue-track" className={selectClass} value={form.trackId} onChange={handleTrackChange}>
                {event.tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start (minutes)" id="cue-start" type="number" min="0" value={form.startMinute} onChange={handleStartChange} />
            <Input label="Duration (minutes)" id="cue-duration" type="number" min="1" value={form.durationMinutes} onChange={handleDurationChange} />
          </div>
          <div>
            <label htmlFor="cue-notes" className="mb-1.5 block text-sm text-text-tertiary">Notes</label>
            <textarea
              id="cue-notes"
              className="w-full rounded-lg border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-brand resize-none"
              rows={3}
              placeholder="Optional notes"
              value={form.notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          {editingCue ? 'Save Changes' : 'Add Cue'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
