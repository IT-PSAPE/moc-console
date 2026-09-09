import { Paragraph, Title } from "@moc/ui/components/display/text"
import { useBroadcastItemDisplay, useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastScrubber } from "./broadcast-scrubber"
import { BroadcastTransport } from "./broadcast-transport"
import { BroadcastVolume } from "./broadcast-volume"

export function BroadcastNowPlaying() {
  const { state } = useBroadcastPlaybackContext()
  const { activeItem, playbackError } = state
  const display = useBroadcastItemDisplay(activeItem?.id)
  const subtitle = playbackError ?? display?.artist

  return (
    <section className="flex w-full flex-col gap-4" aria-label="Now playing">
      <div className="min-w-0">
        <Title.h6 className="truncate" aria-live="polite">{display?.title ?? ""}</Title.h6>
        {subtitle ? (
          <Paragraph.sm
            aria-live={playbackError ? "assertive" : undefined}
            className={playbackError ? "mt-0.5 truncate text-warning" : "mt-0.5 truncate text-tertiary"}
            role={playbackError ? "alert" : undefined}
          >
            {subtitle}
          </Paragraph.sm>
        ) : null}
      </div>

      <BroadcastScrubber />
      <BroadcastTransport />
      <BroadcastVolume />
    </section>
  )
}
