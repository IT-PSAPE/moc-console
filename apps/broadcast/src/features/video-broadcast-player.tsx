import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { GroupedList } from "@moc/ui/components/display/grouped-list"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Section } from "@moc/ui/components/display/section"
import { Alert } from "@moc/ui/components/feedback/alert"
import { useEffect, useRef } from "react"
import { useBroadcastPlayback } from "./use-broadcast-playback"

type VideoBroadcastPlayerProps = {
  broadcast: Broadcast
}

export function VideoBroadcastPlayer({ broadcast }: VideoBroadcastPlayerProps) {
  const playback = useBroadcastPlayback(broadcast)
  const currentRef = useRef<HTMLVideoElement | null>(null)
  const { activeIndex, activeItem, isPlaying, playbackError, preloadIndices } = playback.state
  const { moveToNext, pausePlayback, selectIndex, setPlaybackError, startPlayback } = playback.actions

  useEffect(() => {
    const currentElement = currentRef.current

    if (!currentElement) {
      return
    }

    if (!isPlaying) {
      currentElement.pause()
      return
    }

    void currentElement.play().catch(() => {
      setPlaybackError("Playback needs a user interaction to continue.")
    })
  }, [activeItem?.id, isPlaying, setPlaybackError])

  function handleTogglePlayback() {
    if (isPlaying) {
      pausePlayback()
      return
    }

    startPlayback()
  }

  function handleEnded() {
    moveToNext()
  }

  function createSelectHandler(index: number) {
    return function selectItem() {
      selectIndex(index)
    }
  }

  function renderQueueItem(index: number) {
    const item = broadcast.items[index]
    if (!item) {
      return null
    }

    return (
      <Button key={item.id} variant={index === activeIndex ? "primary" : "secondary"} onClick={createSelectHandler(index)}>
        {item.title}
      </Button>
    )
  }

  function renderBroadcastItem(_: Broadcast["items"][number], index: number) {
    return renderQueueItem(index)
  }

  function renderPreloadVideo(index: number) {
    const item = broadcast.items[index]
    if (!item) {
      return null
    }

    return <video key={item.id} preload="auto" src={item.publicUrl} className="hidden" aria-hidden="true" />
  }

  if (!activeItem) {
    return <Alert variant="warning" title="This broadcast has no playable files." />
  }

  return (
    <Section>
      <Section.Header title={broadcast.title} description={broadcast.description || "Video broadcast"} />
      <Section.Body className="gap-4">
        {playbackError ? (
          <Alert variant="warning" title="Playback paused" description={playbackError} />
        ) : null}
        <video
          ref={currentRef}
          controls
          preload="auto"
          src={activeItem.publicUrl}
          onEnded={handleEnded}
          className="w-full"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleTogglePlayback}>{isPlaying ? "Pause" : "Start playback"}</Button>
          <Paragraph.sm>{broadcast.loopEnabled ? "Looping is enabled." : "Playback stops after the last item."}</Paragraph.sm>
        </div>
        <GroupedList>
          <GroupedList.Group>
            <GroupedList.Header>
              <Label.sm>Queue</Label.sm>
            </GroupedList.Header>
            <GroupedList.Content>
              <div className="flex flex-wrap gap-2">
                {broadcast.items.map(renderBroadcastItem)}
              </div>
            </GroupedList.Content>
          </GroupedList.Group>
        </GroupedList>
        {preloadIndices.map(renderPreloadVideo)}
      </Section.Body>
    </Section>
  )
}
