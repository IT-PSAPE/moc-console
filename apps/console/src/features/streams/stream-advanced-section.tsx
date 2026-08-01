import type { ChangeEvent } from "react"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Accordion } from "@moc/ui/components/display/accordion"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { LatencyPreference } from "@moc/types/streams/stream"
import { latencyPreferenceLabel, latencyPreferenceHint } from "@moc/types/streams/stream-constants"
import { ChevronDown } from "lucide-react"

type StreamAdvancedSectionProps = {
  latencyPreference: LatencyPreference
  enableDvr: boolean
  enableEmbed: boolean
  enableAutoStart: boolean
  enableAutoStop: boolean
  onLatencyChange: (value: LatencyPreference) => void
  onDvrChange: (value: boolean) => void
  onEmbedChange: (value: boolean) => void
  onAutoStartChange: (value: boolean) => void
  onAutoStopChange: (value: boolean) => void
}

export function StreamAdvancedSection({
  latencyPreference,
  enableDvr,
  enableEmbed,
  enableAutoStart,
  enableAutoStop,
  onLatencyChange,
  onDvrChange,
  onEmbedChange,
  onAutoStartChange,
  onAutoStopChange,
}: StreamAdvancedSectionProps) {
  function handleLatencyChange(value: string) {
    onLatencyChange(value as LatencyPreference)
  }

  function handleDvrChange(event: ChangeEvent<HTMLInputElement>) {
    onDvrChange(event.target.checked)
  }

  function handleEmbedChange(event: ChangeEvent<HTMLInputElement>) {
    onEmbedChange(event.target.checked)
  }

  function handleAutoStartChange(event: ChangeEvent<HTMLInputElement>) {
    onAutoStartChange(event.target.checked)
  }

  function handleAutoStopChange(event: ChangeEvent<HTMLInputElement>) {
    onAutoStopChange(event.target.checked)
  }

  return (
    <Accordion.Item value="advanced">
      <Accordion.Trigger className="flex items-center gap-2 py-2 text-left">
        <Label.sm className="flex-1">Advanced settings</Label.sm>
        <ChevronDown className="size-4 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-4 pb-2 pt-1">
          {/* Latency */}
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Latency" />
            <SegmentedControl
              fill
              value={latencyPreference}
              onValueChange={handleLatencyChange}
            >
              {(Object.keys(latencyPreferenceLabel) as LatencyPreference[]).map((key) => (
                <SegmentedControl.Item key={key} value={key}>
                  {latencyPreferenceLabel[key]}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
            <Paragraph.xs className="text-quaternary">
              {latencyPreferenceHint[latencyPreference]}
            </Paragraph.xs>
          </div>

          {/* DVR */}
          <Checkbox
            checked={enableDvr}
            disabled={latencyPreference === "ultraLow"}
            onChange={handleDvrChange}
          >
            <div className="flex flex-col">
              <Paragraph.sm>Enable DVR</Paragraph.sm>
              <Paragraph.xs className="text-quaternary">
                {latencyPreference === "ultraLow"
                  ? "DVR is not available with Ultra Low latency."
                  : "Allows viewers to pause and rewind during the live stream."}
              </Paragraph.xs>
            </div>
          </Checkbox>

          {/* Embedding */}
          <Checkbox
            checked={enableEmbed}
            onChange={handleEmbedChange}
          >
            <div className="flex flex-col">
              <Paragraph.sm>Allow embedding</Paragraph.sm>
              <Paragraph.xs className="text-quaternary">
                Let others embed this stream on their websites.
              </Paragraph.xs>
            </div>
          </Checkbox>

          {/* Auto-start */}
          <Checkbox
            checked={enableAutoStart}
            onChange={handleAutoStartChange}
          >
            <div className="flex flex-col">
              <Paragraph.sm>Auto-start</Paragraph.sm>
              <Paragraph.xs className="text-quaternary">
                Automatically start the broadcast when the encoder begins streaming.
              </Paragraph.xs>
            </div>
          </Checkbox>

          {/* Auto-stop */}
          <Checkbox
            checked={enableAutoStop}
            onChange={handleAutoStopChange}
          >
            <div className="flex flex-col">
              <Paragraph.sm>Auto-stop</Paragraph.sm>
              <Paragraph.xs className="text-quaternary">
                Automatically end the broadcast when the encoder stops streaming.
              </Paragraph.xs>
            </div>
          </Checkbox>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}
