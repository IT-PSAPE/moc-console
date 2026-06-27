import type { ChangeEvent } from "react"
import { Input } from "@moc/ui/components/form/input"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"
import { TextArea } from "@moc/ui/components/form/text-area"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { StreamPrivacy } from "@moc/types/broadcast/stream"
import { streamPrivacyLabel } from "@moc/types/broadcast/stream-constants"

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
  function handleScheduledStartChange(value: string) {
    onScheduledStartChange(value)
  }

  return (
    <>
      {/* ─── Title ─── */}
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Title" required />
        <Input
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value)}
          placeholder="Stream title"
        />
      </div>

      {/* ─── Description ─── */}
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Description" />
        <TextArea
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange(e.target.value)}
          placeholder="Stream description..."
          rows={3}
        />
      </div>

      {/* ─── Scheduled Start ─── */}
      <DateTimeFields
        label="Scheduled Start"
        optional
        value={scheduledStartTime}
        onChange={handleScheduledStartChange}
        helperText={!scheduledStartTime ? "Leave empty to start immediately when going live." : undefined}
      />

      {/* ─── Privacy ─── */}
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Privacy" />
        <SegmentedControl
          fill
          value={privacyStatus}
          onValueChange={(v: string) => onPrivacyChange(v as StreamPrivacy)}
        >
          {(Object.keys(streamPrivacyLabel) as StreamPrivacy[]).map((key) => (
            <SegmentedControl.Item key={key} value={key}>
              {streamPrivacyLabel[key]}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
      </div>

      {/* ─── Made for kids ─── */}
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Made for kids" />
        <SegmentedControl
          fill
          value={isForKids ? "yes" : "no"}
          onValueChange={(v: string) => onIsForKidsChange(v === "yes")}
        >
          <SegmentedControl.Item value="no">No</SegmentedControl.Item>
          <SegmentedControl.Item value="yes">Yes</SegmentedControl.Item>
        </SegmentedControl>
      </div>
    </>
  )
}
