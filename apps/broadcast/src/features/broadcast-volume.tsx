import { Volume1, VolumeX } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastSlider } from "./broadcast-slider"

export function BroadcastVolume() {
  const { state, actions } = useBroadcastPlaybackContext()
  const { isMuted, volume } = state
  const { changeVolume, toggleMuted } = actions
  const displayedVolume = isMuted ? 0 : volume

  return (
    <div className="flex items-center gap-2">
      <Button.Icon
        aria-label={isMuted ? "Unmute" : "Mute"}
        variant="ghost"
        className="size-7 min-w-0 shrink-0 rounded-full border-transparent text-quaternary hover:text-primary [&_svg]:size-4"
        icon={isMuted ? <VolumeX /> : <Volume1 />}
        onClick={toggleMuted}
      />
      <BroadcastSlider
        ariaLabel="Volume"
        ariaValueText={`${Math.round(displayedVolume * 100)} percent`}
        fillRatio={displayedVolume}
        max={1}
        onChange={changeVolume}
        step={0.05}
        value={displayedVolume}
      />
    </div>
  )
}
