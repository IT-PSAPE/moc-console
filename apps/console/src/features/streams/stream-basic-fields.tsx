import type { ChangeEvent } from "react"
import { useId } from "react"
import { Input } from "@moc/ui/components/form/input"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"
import { TextArea } from "@moc/ui/components/form/text-area"
import { FormField } from "@moc/ui/components/form/form-label"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { StreamPrivacy } from "@moc/types/streams/stream"
import { streamPrivacyLabel } from "@moc/types/streams/stream-constants"

type StreamBasicFieldsProps = {
  title: string
  description: string
  scheduledStartTime: string
  privacyStatus: StreamPrivacy
  isForKids: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onScheduledStartChange: (value: string) => void
  onPrivacyChange: (value: StreamPrivacy) => void
  onIsForKidsChange: (value: boolean) => void
}

export function StreamBasicFields({
  title,
  description,
  scheduledStartTime,
  privacyStatus,
  isForKids,
  onTitleChange,
  onDescriptionChange,
  onScheduledStartChange,
  onPrivacyChange,
  onIsForKidsChange,
}: StreamBasicFieldsProps) {
  const fieldId = useId()
  const titleId = `${fieldId}-title`
  const descriptionId = `${fieldId}-description`

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    onTitleChange(event.target.value)
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onDescriptionChange(event.target.value)
  }

  function handleScheduledStartChange(value: string) {
    onScheduledStartChange(value)
  }

  function handlePrivacyChange(value: string) {
    onPrivacyChange(value as StreamPrivacy)
  }

  function handleIsForKidsChange(value: string) {
    onIsForKidsChange(value === "yes")
  }

  return (
    <>
      <FormField label="Title" htmlFor={titleId} required>
        <Input
          id={titleId}
          aria-label="Stream title"
          name="stream-title"
          autoComplete="off"
          value={title}
          onChange={handleTitleChange}
          placeholder="Stream title"
        />
      </FormField>

      <FormField label="Description" htmlFor={descriptionId} optional>
        <TextArea
          id={descriptionId}
          aria-label="Stream description"
          name="stream-description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Stream description…"
          rows={3}
        />
      </FormField>

      <DateTimeFields
        label="Scheduled start"
        name="scheduled-start"
        optional
        value={scheduledStartTime}
        onChange={handleScheduledStartChange}
        helperText={!scheduledStartTime ? "Leave empty to start immediately when going live." : undefined}
      />

      <FormField label="Privacy">
        <SegmentedControl
          fill
          value={privacyStatus}
          onValueChange={handlePrivacyChange}
        >
          {(Object.keys(streamPrivacyLabel) as StreamPrivacy[]).map((key) => (
            <SegmentedControl.Item key={key} value={key}>
              {streamPrivacyLabel[key]}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
      </FormField>

      <FormField label="Made for kids">
        <SegmentedControl
          fill
          value={isForKids ? "yes" : "no"}
          onValueChange={handleIsForKidsChange}
        >
          <SegmentedControl.Item value="no">No</SegmentedControl.Item>
          <SegmentedControl.Item value="yes">Yes</SegmentedControl.Item>
        </SegmentedControl>
      </FormField>
    </>
  )
}
