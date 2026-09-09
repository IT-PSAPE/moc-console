import { useBroadcastItemDisplay, useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastCover } from "./broadcast-cover"

export function BroadcastArtwork() {
  const { state } = useBroadcastPlaybackContext()
  const display = useBroadcastItemDisplay(state.activeItem?.id)

  return (
    <BroadcastCover
      className="aspect-square w-full max-w-[min(16rem,65vw,34svh)] rounded-xl lg:max-w-none"
      coverUrl={display?.coverUrl ?? null}
      iconClassName="size-10"
      title={display?.title ?? ""}
    />
  )
}
