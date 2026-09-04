import { Paragraph } from "@moc/ui/components/display/text"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { formatElapsedTime, formatRemainingTime } from "./broadcast-format"
import { BroadcastSlider } from "./broadcast-slider"

export function BroadcastScrubber() {
  const { state, actions } = useBroadcastPlaybackContext()
  const { durationSeconds, elapsedSeconds } = state
  const { seek } = actions
  const isSeekable = durationSeconds > 0
  const elapsedLabel = formatElapsedTime(elapsedSeconds, durationSeconds)

  return (
    <div className="flex flex-col gap-1">
      <BroadcastSlider
        ariaLabel="Seek"
        ariaValueText={elapsedLabel}
        disabled={!isSeekable}
        fillRatio={isSeekable ? elapsedSeconds / durationSeconds : 0}
        max={isSeekable ? durationSeconds : 1}
        onChange={seek}
        step={1}
        value={isSeekable ? Math.min(elapsedSeconds, durationSeconds) : 0}
      />
      <div className="flex items-center justify-between">
        <Paragraph.xs className="text-quaternary tabular-nums">{elapsedLabel}</Paragraph.xs>
        <Paragraph.xs className="text-quaternary tabular-nums">{formatRemainingTime(elapsedSeconds, durationSeconds)}</Paragraph.xs>
      </div>
    </div>
  )
}
