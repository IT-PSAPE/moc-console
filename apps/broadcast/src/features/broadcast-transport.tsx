import { Button } from "@moc/ui/components/controls/button"
import { Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

const stepButtonClassName = "size-11 min-w-0 rounded-full border-transparent [&_svg]:size-6"

export function BroadcastTransport() {
  const { state, actions } = useBroadcastPlaybackContext()
  const { isFullscreen, isPlaying } = state
  const { moveToNext, moveToPrevious, togglePlayback } = actions

  function handleToggleFullscreen() {
    void actions.toggleFullscreen()
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center justify-center gap-3">
        <Button.Icon
          aria-label="Previous item"
          variant="ghost"
          className={stepButtonClassName}
          icon={<SkipBack className="fill-current" />}
          onClick={moveToPrevious}
        />
        <Button.Icon
          aria-label={isPlaying ? "Pause" : "Play"}
          variant="ghost"
          className="size-14 min-w-0 rounded-full border-transparent [&_svg]:size-8"
          icon={isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          onClick={togglePlayback}
        />
        <Button.Icon
          aria-label="Next item"
          variant="ghost"
          className={stepButtonClassName}
          icon={<SkipForward className="fill-current" />}
          onClick={moveToNext}
        />
      </div>
      <Button.Icon
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        variant="ghost"
        className="size-7 min-w-0 shrink-0 rounded-full border-transparent text-quaternary hover:text-primary [&_svg]:size-4"
        icon={isFullscreen ? <Minimize2 /> : <Maximize2 />}
        onClick={handleToggleFullscreen}
      />
    </div>
  )
}
