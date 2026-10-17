import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"
import { FormField } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Select } from "@moc/ui/components/form/select"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Modal } from "@moc/ui/components/overlays/modal"
import { UnsavedChangesDialog } from "@moc/ui/components/overlays/unsaved-changes-dialog"
import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/streams/zoom"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { NotifyDestinationField } from "./notify-destination-field"
import { MEETING_TIMEZONES, useMeetingForm } from "./use-meeting-form"

type MeetingFormProps = {
  initialTitle?: string
  initialScheduledAt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: CreateMeetingParams) => Promise<void> | void
  meeting?: ZoomMeeting | null
}

const TIMEZONE_ITEMS = MEETING_TIMEZONES.map((value) => ({ label: value, value }))

export function MeetingForm({ open, onOpenChange, onSubmit, meeting, initialTitle, initialScheduledAt }: MeetingFormProps) {
  const { state, actions, meta } = useMeetingForm({ meeting, onOpenChange, onSubmit, open, initialTitle, initialScheduledAt })

  function renderTimezone(timezone: string) {
    return <Select.Item key={timezone} value={timezone}>{timezone}</Select.Item>
  }

  function renderRecurrence(recurrence: ZoomRecurrenceType) {
    return <SegmentedControl.Item key={recurrence} value={recurrence}>{zoomRecurrenceLabel[recurrence]}</SegmentedControl.Item>
  }

  const recurrenceTypes = Object.keys(zoomRecurrenceLabel) as ZoomRecurrenceType[]

  return (
    <>
      <Modal.Content>
        <FormField label="Topic" htmlFor="meeting-topic" required>
          <Input id="meeting-topic" aria-label="Meeting topic" name="meeting-topic" autoComplete="off" value={state.topic} onChange={actions.changeTopic} placeholder="Meeting topic" />
        </FormField>

        <FormField label="Description" htmlFor="meeting-description" optional>
          <TextArea id="meeting-description" aria-label="Meeting description" name="meeting-description" value={state.description} onChange={actions.changeDescription} placeholder="Meeting agenda…" rows={3} />
        </FormField>

        <DateTimeFields label="Start" name="meeting-start" required value={state.startTime} onChange={actions.setStartTime} />

        <FormField label="Duration (minutes)" htmlFor="meeting-duration">
          <Input id="meeting-duration" aria-label="Meeting duration in minutes" name="meeting-duration" type="number" value={String(state.duration)} onChange={actions.changeDuration} min="1" />
        </FormField>

        <FormField label="Timezone">
          <Select.Root name="meeting-timezone" items={TIMEZONE_ITEMS} value={state.timezone} onValueChange={actions.changeTimezone}>
            <Select.Trigger aria-label="Timezone" />
            <Select.Content>{MEETING_TIMEZONES.map(renderTimezone)}</Select.Content>
          </Select.Root>
        </FormField>

        <FormField label="Repeat">
          <SegmentedControl fill value={state.recurrenceType} onValueChange={actions.changeRecurrenceType}>
            {recurrenceTypes.map(renderRecurrence)}
          </SegmentedControl>
        </FormField>

        {state.recurrenceType === "weekly" ? (
          <FormField label="Day of week (1=Sun, 2=Mon, …, 7=Sat)" htmlFor="weekly-recurrence-day">
            <Input id="weekly-recurrence-day" aria-label="Weekly recurrence day" name="weekly-recurrence-day" value={state.recurrenceDays} onChange={actions.changeRecurrenceDays} placeholder="e.g. 4 for Wednesday" />
          </FormField>
        ) : null}

        {state.recurrenceType === "monthly" ? (
          <FormField label="Day of month" htmlFor="monthly-recurrence-day">
            <Input id="monthly-recurrence-day" aria-label="Monthly recurrence day" name="monthly-recurrence-day" type="number" value={state.recurrenceDays} onChange={actions.changeRecurrenceDays} placeholder="e.g. 15" min="1" max="31" />
          </FormField>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label.sm>Meeting settings</Label.sm>
          <Checkbox checked={state.waitingRoom} onChange={actions.changeWaitingRoom}><Paragraph.sm>Waiting room</Paragraph.sm></Checkbox>
          <Checkbox checked={state.muteOnEntry} onChange={actions.changeMuteOnEntry}><Paragraph.sm>Mute participants on entry</Paragraph.sm></Checkbox>
          <Checkbox checked={state.continuousChat} onChange={actions.changeContinuousChat}><Paragraph.sm>Allow continuous chat</Paragraph.sm></Checkbox>
        </div>

        {!meta.isEditing ? <NotifyDestinationField value={state.notifyDestinations} onChange={actions.setNotifyDestinations} /> : null}
      </Modal.Content>

      <Modal.Footer>
        <Button variant="secondary" onClick={actions.requestClose}>Cancel</Button>
        <Button variant="primary" disabled={!state.canSubmit} onClick={actions.submit}>{meta.submitLabel}</Button>
      </Modal.Footer>
      <UnsavedChangesDialog open={state.discardChangesOpen} onSave={actions.submit} onDiscard={actions.close} onCancel={actions.cancelDiscardChanges} isSaving={state.isSubmitting} />
    </>
  )
}
