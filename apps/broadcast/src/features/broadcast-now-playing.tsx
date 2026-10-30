import { Paragraph } from "@moc/ui/components/display/text"
import { Notification } from "@moc/ui/components/feedback/notification"
import { useBroadcastItemDisplay, useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastScrubber } from "./broadcast-scrubber"
import { BroadcastTransport } from "./broadcast-transport"
import { BroadcastVolume } from "./broadcast-volume"

export function BroadcastNowPlaying() {
  const { state } = useBroadcastPlaybackContext()
  const { activeItem, playbackError } = state
  const display = useBroadcastItemDisplay(activeItem?.id)

  return (
    <section className="flex w-full flex-col gap-4" aria-label="Now playing">
      {playbackError ? <Notification title="Playback needs attention" description={playbackError} variant="warning" /> : null}
      <div className="min-w-0">
        <h1 className="title-h6 truncate" aria-live="polite">{display?.title ?? "Now playing"}</h1>
        {display?.artist ? <Paragraph.sm className="mt-0.5 truncate text-tertiary">{display.artist}</Paragraph.sm> : null}
      </div>

      <BroadcastScrubber />
      <BroadcastTransport />
      <BroadcastVolume />
    </section>
  )
}
