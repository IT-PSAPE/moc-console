import type { FormEvent } from "react"
import { Alert } from "@moc/ui/components/feedback/alert"
import { VenueBookingDetails } from "@/features/components/venue-booking-details"
import { StepErrorSummary } from "@/features/components/step-error-summary"
import { TrackingEditorActions } from "@/features/components/tracking-editor-actions"
import { useTrackingVenueEditor } from "@/features/hooks/use-tracking-venue-editor"
import type { TrackingResult, TrackingVenueBookingResult } from "@/types/tracking"

type TrackingVenueEditorProps = {
  result: TrackingVenueBookingResult
  onSaved: (submission: TrackingResult) => void
  onCancel: () => void
}

export function TrackingVenueEditor({ result, onSaved, onCancel }: TrackingVenueEditorProps) {
  const editor = useTrackingVenueEditor(result, onSaved)
  const availability = editor.state.availability

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void editor.actions.save()
  }

  return (
    <form className="flex flex-col gap-8" noValidate onSubmit={handleSubmit}>
      <StepErrorSummary errors={editor.state.validationErrors} />
      <VenueBookingDetails
        data={editor.state.data}
        venues={availability.venues}
        events={availability.events}
        listsLoading={availability.listsLoading}
        slots={availability.slots}
        slotsLoading={availability.slotsLoading}
        onChange={editor.actions.setField}
        onVenueChange={editor.actions.setVenue}
        onEventChange={editor.actions.setEvent}
        onDateChange={editor.actions.setBookingDate}
        onSlotsChange={editor.actions.setSlots}
        errors={editor.state.validationErrors}
      />
      {availability.listsError && <Alert title="Could not load venues" description={availability.listsError} variant="error" style="filled" />}
      {availability.slotsError && <Alert title="Could not load availability" description={availability.slotsError} variant="error" style="filled" />}
      <TrackingEditorActions saving={editor.state.saving} error={editor.state.error} onCancel={onCancel} />
    </form>
  )
}
