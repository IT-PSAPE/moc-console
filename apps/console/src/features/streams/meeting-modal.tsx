import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Select } from "@moc/ui/components/form/select"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/streams/zoom"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { NotifyDestinationField } from "./notify-destination-field"
import { MEETING_TIMEZONES, useMeetingForm } from "./use-meeting-form"

type MeetingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: CreateMeetingParams) => Promise<void> | void
  meeting?: ZoomMeeting | null
}

const TIMEZONE_ITEMS = MEETING_TIMEZONES.map((value) => ({ label: value, value }))

export function MeetingModal({ open, onOpenChange, onSubmit, meeting }: MeetingModalProps) {
  const { state, actions, meta } = useMeetingForm({ meeting, onOpenChange, onSubmit, open })

  return (
    <Modal open={open} onOpenChange={actions.changeOpen}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:max-w-md">
            <Modal.Header>
              <Label.md>{meta.title}</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                {/* Topic */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Topic" required />
                  <Input
                    aria-label="Meeting topic"
                    name="meeting-topic"
                    autoComplete="off"
                    value={state.topic}
                    onChange={actions.changeTopic}
                    placeholder="Meeting topic"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Description" />
                  <TextArea
                    aria-label="Meeting description"
                    name="meeting-description"
                    value={state.description}
                    onChange={actions.changeDescription}
                    placeholder="Meeting agenda…"
                    rows={3}
                  />
                </div>

                {/* Start time */}
                <DateTimeFields label="Start" name="meeting-start" required value={state.startTime} onChange={actions.setStartTime} />

                {/* Duration */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Duration (minutes)" />
                  <Input
                    aria-label="Meeting duration in minutes"
                    name="meeting-duration"
                    type="number"
                    value={String(state.duration)}
                    onChange={actions.changeDuration}
                    min="1"
                  />
                </div>

                {/* Timezone */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Timezone" />
                  <Select.Root name="meeting-timezone" items={TIMEZONE_ITEMS} value={state.timezone} onValueChange={actions.changeTimezone}>
                    <Select.Trigger aria-label="Timezone" />
                    <Select.Content>
                    {MEETING_TIMEZONES.map((tz) => (
                      <Select.Item key={tz} value={tz}>{tz}</Select.Item>
                    ))}
                    </Select.Content>
                  </Select.Root>
                </div>

                {/* Recurrence */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Repeat" />
                  <SegmentedControl
                    fill
                    value={state.recurrenceType}
                    onValueChange={actions.changeRecurrenceType}
                  >
                    {(Object.keys(zoomRecurrenceLabel) as ZoomRecurrenceType[]).map((key) => (
                      <SegmentedControl.Item key={key} value={key}>
                        {zoomRecurrenceLabel[key]}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl>
                </div>

                {/* Recurrence days (contextual) */}
                {state.recurrenceType === "weekly" && (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="Day of week (1=Sun, 2=Mon, …, 7=Sat)" />
                    <Input
                      aria-label="Weekly recurrence day"
                      name="weekly-recurrence-day"
                      value={state.recurrenceDays}
                      onChange={actions.changeRecurrenceDays}
                      placeholder="e.g. 4 for Wednesday"
                    />
                  </div>
                )}

                {state.recurrenceType === "monthly" && (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="Day of month" />
                    <Input
                      aria-label="Monthly recurrence day"
                      name="monthly-recurrence-day"
                      type="number"
                      value={state.recurrenceDays}
                      onChange={actions.changeRecurrenceDays}
                      placeholder="e.g. 15"
                      min="1"
                      max="31"
                    />
                  </div>
                )}

                {/* Meeting settings */}
                <div className="flex flex-col gap-2 pt-2">
                  <Paragraph.xs className="text-tertiary font-medium uppercase tracking-wide">Meeting settings</Paragraph.xs>
                  <Checkbox
                    checked={state.waitingRoom}
                    onChange={actions.changeWaitingRoom}
                  >
                    <Paragraph.sm>Waiting room</Paragraph.sm>
                  </Checkbox>
                  <Checkbox
                    checked={state.muteOnEntry}
                    onChange={actions.changeMuteOnEntry}
                  >
                    <Paragraph.sm>Mute participants on entry</Paragraph.sm>
                  </Checkbox>
                  <Checkbox
                    checked={state.continuousChat}
                    onChange={actions.changeContinuousChat}
                  >
                    <Paragraph.sm>Allow continuous chat</Paragraph.sm>
                  </Checkbox>
                </div>

                {!meta.isEditing && (
                  <NotifyDestinationField
                    value={state.notifyDestinations}
                    onChange={actions.setNotifyDestinations}
                  />
                )}
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button variant="primary" disabled={!state.canSubmit} onClick={actions.submit}>
                {meta.submitLabel}
              </Button>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
