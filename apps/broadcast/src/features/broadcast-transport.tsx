import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Alert } from "@moc/ui/components/feedback/alert"
import { Range } from "@moc/ui/components/form/range"
import { Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

export function BroadcastTransport() {
  const { state, actions } = useBroadcastPlaybackContext()
  const { activeItem, isFullscreen, isMuted, isPlaying, playbackError, volume } = state
  const displayedVolume = isMuted ? 0 : volume

  function handleToggleFullscreen() {
    void actions.toggleFullscreen()
  }

  return (
    <div className="flex flex-col gap-3 border-t border-secondary px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="min-w-0 text-center">
        <Label.xs className="text-quaternary">Now playing</Label.xs>
        <Paragraph.md className="truncate" aria-live="polite">{activeItem?.title}</Paragraph.md>
      </div>

      {playbackError ? <Alert variant="warning" title={playbackError} /> : null}

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Button.Icon aria-label="Previous item" variant="secondary" icon={<SkipBack className="fill-current" />} onClick={actions.moveToPrevious} />
        <Button.Icon
          aria-label={isPlaying ? "Pause" : "Play"}
          className="size-12 rounded-full sm:size-14 [&_svg]:size-5"
          icon={isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          onClick={actions.togglePlayback}
        />
        <Button.Icon aria-label="Next item" variant="secondary" icon={<SkipForward className="fill-current" />} onClick={actions.moveToNext} />
        <Button.Icon
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          variant="ghost"
          icon={isFullscreen ? <Minimize2 /> : <Maximize2 />}
          onClick={handleToggleFullscreen}
        />
      </div>

      <div className="mx-auto flex w-full max-w-xs items-center gap-2">
        <Button.Icon aria-label={isMuted ? "Unmute" : "Mute"} variant="ghost" icon={isMuted ? <VolumeX /> : <Volume2 />} onClick={actions.toggleMuted} />
        <Range
          aria-label="Volume"
          aria-valuetext={`${Math.round(displayedVolume * 100)} percent`}
          className="flex-1"
          max="1"
          min="0"
          onChange={actions.changeVolume}
          step="0.05"
          value={displayedVolume}
        />
      </div>
    </div>
  )
}
