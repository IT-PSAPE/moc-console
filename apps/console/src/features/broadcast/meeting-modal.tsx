import { useCallback, useState } from "react"
import type { ChangeEvent } from "react"
import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/broadcast/zoom"
import { zoomRecurrenceLabel } from "@moc/types/broadcast/zoom-constants"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"

type MeetingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: CreateMeetingParams) => Promise<void> | void
  meeting?: ZoomMeeting | null
}

const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Harare",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
]

export function MeetingModal({ open, onOpenChange, onSubmit, meeting }: MeetingModalProps) {
  const isEditing = Boolean(meeting)

  const [topic, setTopic] = useState(meeting?.topic ?? "")
  const [description, setDescription] = useState(meeting?.description ?? "")
  const [startTime, setStartTime] = useState(
    meeting?.startTime ? formatUtcIsoForDateTimeInput(meeting.startTime, meeting.timezone) : "",
  )
  const [duration, setDuration] = useState(meeting?.duration ?? 60)
  const [timezone, setTimezone] = useState(meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [recurrenceType, setRecurrenceType] = useState<ZoomRecurrenceType>(meeting?.recurrenceType ?? "none")
  const [recurrenceDays, setRecurrenceDays] = useState(meeting?.recurrenceDays ?? "")
  const [waitingRoom, setWaitingRoom] = useState(meeting?.waitingRoom ?? true)
  const [muteOnEntry, setMuteOnEntry] = useState(meeting?.muteOnEntry ?? true)
  const [continuousChat, setContinuousChat] = useState(meeting?.continuousChat ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = Boolean(topic.trim()) && Boolean(startTime) && !isSubmitting

  const resetForm = useCallback(() => {
    setTopic(meeting?.topic ?? "")
    setDescription(meeting?.description ?? "")
    setStartTime(meeting?.startTime ? formatUtcIsoForDateTimeInput(meeting.startTime, meeting.timezone) : "")
    setDuration(meeting?.duration ?? 60)
    setTimezone(meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
    setRecurrenceType(meeting?.recurrenceType ?? "none")
    setRecurrenceDays(meeting?.recurrenceDays ?? "")
    setWaitingRoom(meeting?.waitingRoom ?? true)
    setMuteOnEntry(meeting?.muteOnEntry ?? true)
    setContinuousChat(meeting?.continuousChat ?? false)
  }, [meeting])

  function handleModalOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        topic: topic.trim(),
        description: description.trim(),
        startTime: parseDateTimeInputToUtcIso(startTime, timezone),
        duration,
        timezone,
        recurrenceType,
        recurrenceInterval: recurrenceType !== "none" ? 1 : null,
        recurrenceDays: recurrenceDays || null,
        waitingRoom,
        muteOnEntry,
        continuousChat,
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleModalOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="w-full max-w-md">
            <Modal.Header>
              <Label.md>{isEditing ? "Edit Meeting" : "Schedule Meeting"}</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                {/* Topic */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Topic" required />
                  <Input
                    value={topic}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                    placeholder="Meeting topic"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Description" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Meeting agenda..."
                    rows={3}
                    className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                </div>

                {/* Start time */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Start Date & Time" required />
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                  />
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Duration (minutes)" />
                  <Input
                    type="number"
                    value={String(duration)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDuration(Math.max(1, parseInt(e.target.value) || 60))}
                    min="1"
                  />
                </div>

                {/* Timezone */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Timezone" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Recurrence */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Repeat" />
                  <SegmentedControl
                    fill
                    value={recurrenceType}
                    onValueChange={(v: string) => setRecurrenceType(v as ZoomRecurrenceType)}
                  >
                    {(Object.keys(zoomRecurrenceLabel) as ZoomRecurrenceType[]).map((key) => (
                      <SegmentedControl.Item key={key} value={key}>
                        {zoomRecurrenceLabel[key]}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl>
                </div>

                {/* Recurrence days (contextual) */}
                {recurrenceType === "weekly" && (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="Day of week (1=Sun, 2=Mon, ..., 7=Sat)" />
                    <Input
                      value={recurrenceDays}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRecurrenceDays(e.target.value)}
                      placeholder="e.g. 4 for Wednesday"
                    />
                  </div>
                )}

                {recurrenceType === "monthly" && (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="Day of month" />
                    <Input
                      type="number"
                      value={recurrenceDays}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRecurrenceDays(e.target.value)}
                      placeholder="e.g. 15"
                      min="1"
                      max="31"
                    />
                  </div>
                )}

                {/* Meeting settings */}
                <div className="flex flex-col gap-2 pt-2">
                  <Paragraph.xs className="text-tertiary font-medium uppercase tracking-wide">Meeting Settings</Paragraph.xs>
                  <Checkbox
                    checked={waitingRoom}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setWaitingRoom(e.target.checked)}
                  >
                    <Paragraph.sm>Waiting room</Paragraph.sm>
                  </Checkbox>
                  <Checkbox
                    checked={muteOnEntry}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMuteOnEntry(e.target.checked)}
                  >
                    <Paragraph.sm>Mute participants on entry</Paragraph.sm>
                  </Checkbox>
                  <Checkbox
                    checked={continuousChat}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setContinuousChat(e.target.checked)}
                  >
                    <Paragraph.sm>Allow continuous chat</Paragraph.sm>
                  </Checkbox>
                </div>
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
                {isSubmitting
                  ? isEditing ? "Updating..." : "Scheduling..."
                  : isEditing ? "Update Meeting" : "Schedule Meeting"}
              </Button>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
