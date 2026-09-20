import type { FormEvent } from "react"
import { BookingDetails } from "@/features/components/booking-details"
import { BookingEquipmentPicker } from "@/features/components/booking-equipment-picker"
import { StepErrorSummary } from "@/features/components/step-error-summary"
import { TrackingEditorActions } from "@/features/components/tracking-editor-actions"
import { useTrackingBookingEditor } from "@/features/hooks/use-tracking-booking-editor"
import type { TrackingBookingResult, TrackingResult } from "@/types/tracking"

type TrackingBookingEditorProps = {
  result: TrackingBookingResult
  onSaved: (submission: TrackingResult) => void
  onCancel: () => void
}

export function TrackingBookingEditor({ result, onSaved, onCancel }: TrackingBookingEditorProps) {
  const editor = useTrackingBookingEditor(result, onSaved)

  function handleOtherEquipmentChange(value: string) {
    editor.actions.setField("otherEquipment", value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void editor.actions.save()
  }

  return (
    <form className="flex flex-col gap-8" noValidate onSubmit={handleSubmit}>
      <StepErrorSummary errors={editor.state.validationErrors} />
      <BookingDetails data={editor.state.data} onChange={editor.actions.setField} errors={editor.state.validationErrors} />
      <BookingEquipmentPicker selected={editor.state.data.requestedEquipment} onToggle={editor.actions.toggleRequestedEquipment} otherEquipment={editor.state.data.otherEquipment} onOtherChange={handleOtherEquipmentChange} errors={editor.state.validationErrors} />
      <TrackingEditorActions saving={editor.state.saving} error={editor.state.error} onCancel={onCancel} />
    </form>
  )
}
