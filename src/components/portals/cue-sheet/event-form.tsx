import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CueEvent } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

interface EventFormProps {
  open: boolean
  onClose: () => void
  editingEvent: CueEvent | null
  dispatch: Dispatch<CueSheetAction>
}

interface FormState {
  name: string
  description: string
  totalDurationMinutes: string
}

function makeInitial(event: CueEvent | null): FormState {
  if (event) {
    return { name: event.name, description: event.description, totalDurationMinutes: String(event.totalDurationMinutes) }
  }
  return { name: '', description: '', totalDurationMinutes: '120' }
}

export function EventForm({ open, onClose, editingEvent, dispatch }: EventFormProps) {
  const [form, setForm] = useState<FormState>(() => makeInitial(editingEvent))

  function handleClose() {
    setForm(makeInitial(editingEvent))
    onClose()
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, name: e.target.value }))
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, description: e.target.value }))
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, totalDurationMinutes: e.target.value }))
  }

  function handleSubmit() {
    const data = {
      name: form.name,
      description: form.description,
      totalDurationMinutes: parseInt(form.totalDurationMinutes, 10) || 120,
    }
    if (editingEvent) {
      dispatch({ type: 'UPDATE_EVENT', eventId: editingEvent.id, changes: data })
    } else {
      dispatch({ type: 'ADD_EVENT', event: data })
    }
    handleClose()
  }

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>{editingEvent ? 'Edit Event' : 'New Event'}</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <Input label="Event Name" id="event-name" placeholder="e.g. National Day Summit" value={form.name} onChange={handleNameChange} />
          <div>
            <label htmlFor="event-desc" className="mb-1.5 block text-sm text-text-tertiary">Description</label>
            <textarea
              id="event-desc"
              className="w-full rounded-lg border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-brand resize-none"
              rows={3}
              placeholder="Brief description of the event"
              value={form.description}
              onChange={handleDescriptionChange}
            />
          </div>
          <Input
            label="Total Duration (minutes)"
            id="event-duration"
            type="number"
            min="15"
            value={form.totalDurationMinutes}
            onChange={handleDurationChange}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!form.name.trim()}>
          {editingEvent ? 'Save Changes' : 'Create Event'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
