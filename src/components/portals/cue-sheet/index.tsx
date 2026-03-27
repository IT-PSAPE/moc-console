import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useCueSheetReducer } from '@/hooks/use-cue-sheet-reducer'
import { EventList } from './event-list'
import { TimelineCanvas } from './timeline-canvas'
import { CueItemForm } from './cue-item-form'
import { TrackForm } from './track-form'
import { EventForm } from './event-form'
import { ImportExport } from './import-export'
import type { CueEvent, CueItem, Track } from '@/types'

export function CueSheetPortal() {
  const { state, activeEvent, dispatch } = useCueSheetReducer()

  const [cueFormOpen, setCueFormOpen] = useState(false)
  const [cueFormTrackId, setCueFormTrackId] = useState<string | undefined>()
  const [editingCue, setEditingCue] = useState<CueItem | null>(null)

  const [trackFormOpen, setTrackFormOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)

  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CueEvent | null>(null)

  function handleNewEvent() {
    setEditingEvent(null)
    setEventFormOpen(true)
  }

  function handleCloseEventForm() {
    setEventFormOpen(false)
    setEditingEvent(null)
  }

  function handleSelectEvent(id: string) {
    dispatch({ type: 'SET_ACTIVE_EVENT', eventId: id })
  }

  function handleAddCue(trackId?: string) {
    setEditingCue(null)
    setCueFormTrackId(trackId)
    setCueFormOpen(true)
  }

  function handleEditCue(cue: CueItem) {
    setEditingCue(cue)
    setCueFormOpen(true)
  }

  function handleCloseCueForm() {
    setCueFormOpen(false)
    setEditingCue(null)
    setCueFormTrackId(undefined)
  }

  function handleAddTrack() {
    setEditingTrack(null)
    setTrackFormOpen(true)
  }

  function handleEditTrack(track: Track) {
    setEditingTrack(track)
    setTrackFormOpen(true)
  }

  function handleCloseTrackForm() {
    setTrackFormOpen(false)
    setEditingTrack(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cue Sheet"
        description="Plan and manage event timelines with tracks and cue items"
        actions={<ImportExport events={state.events} dispatch={dispatch} />}
      />

      <Tabs.Root defaultTab="events">
        <Tabs.List>
          <Tabs.Trigger id="events">Events</Tabs.Trigger>
          <Tabs.Trigger id="timeline">Timeline</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content id="events">
          <EventList
            events={state.events}
            activeEventId={state.activeEventId}
            dispatch={dispatch}
            onSelectEvent={handleSelectEvent}
            onNewEvent={handleNewEvent}
          />
        </Tabs.Content>

        <Tabs.Content id="timeline">
          {activeEvent ? (
            <TimelineCanvas
              event={activeEvent}
              dispatch={dispatch}
              onAddCue={handleAddCue}
              onEditCue={handleEditCue}
              onAddTrack={handleAddTrack}
              onEditTrack={handleEditTrack}
            />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-secondary">
              <p className="text-sm text-text-quaternary">No event selected</p>
              <Button variant="secondary" size="sm" onClick={handleNewEvent}>Create an Event</Button>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {activeEvent && (
        <>
          <CueItemForm
            open={cueFormOpen}
            onClose={handleCloseCueForm}
            event={activeEvent}
            editingCue={editingCue}
            initialTrackId={cueFormTrackId}
            dispatch={dispatch}
          />
          <TrackForm
            open={trackFormOpen}
            onClose={handleCloseTrackForm}
            eventId={activeEvent.id}
            editingTrack={editingTrack}
            dispatch={dispatch}
          />
        </>
      )}

      <EventForm
        open={eventFormOpen}
        onClose={handleCloseEventForm}
        editingEvent={editingEvent}
        dispatch={dispatch}
      />
    </div>
  )
}
