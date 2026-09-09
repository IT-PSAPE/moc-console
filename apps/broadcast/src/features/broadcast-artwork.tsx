import { useBroadcastItemDisplay, useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastCover } from "./broadcast-cover"

export function BroadcastArtwork() {
  const { state } = useBroadcastPlaybackContext()
  const display = useBroadcastItemDisplay(state.activeItem?.id)

  return (
    <BroadcastCover
      className="aspect-square w-full rounded-xl"
      coverUrl={display?.coverUrl ?? null}
      iconClassName="size-10"
      title={display?.title ?? ""}
    />
  )
}
