import { useCallback, useEffect, useRef, useState } from "react"
import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/controls/button"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Badge } from "@/components/display/badge"
import { mediaTypeColor, mediaTypeLabel } from "@/types/broadcast/constants"
import type { MediaItem, SlideImage } from "@/types/broadcast/media-item"
import { Eye, SkipForward, SkipBack, Play, Pause } from "lucide-react"

type MediaPreviewProps = {
  item: MediaItem | null
}

const emptySlides: SlideImage[] = []

export function MediaPreview({ item }: MediaPreviewProps) {
  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState icon={<Eye />} title="No media selected" description="Select a media item to preview it here." />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-secondary">
        <Title.h5 className="flex-1 truncate">{item.name}</Title.h5>
        <Badge label={mediaTypeLabel[item.type]} color={mediaTypeColor[item.type]} />
      </div>

      {/* Preview area */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-secondary_alt">
        {item.type === "image" && <ImagePreview key={item.id} item={item} />}
        {item.type === "video" && <VideoPreview key={item.id} item={item} />}
        {item.type === "audio" && <AudioPreview key={item.id} item={item} />}
        {item.type === "slide" && <SlidePreview key={item.id} item={item} />}
      </div>
    </div>
  )
}

function formatDuration(duration: number) {
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
}

function ImagePreview({ item }: { item: MediaItem }) {
  return (
    <img
      src={item.url}
      alt={item.name}
      className="max-w-full max-h-full object-contain rounded-lg"
    />
  )
}

// ─── Video Preview ─────────────────────────────────────

function VideoPreview({ item }: { item: MediaItem }) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <video
        key={item.id}
        src={item.url}
        poster={item.thumbnail ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video bg-primary rounded-lg border border-tertiary"
      />
      {item.duration && (
        <Paragraph.xs className="text-tertiary">
          Duration: {formatDuration(item.duration)}
        </Paragraph.xs>
      )}
    </div>
  )
}

// ─── Audio Preview ─────────────────────────────────────

function AudioPreview({ item }: { item: MediaItem }) {
  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4 p-6">
      <div className="size-24 rounded-full bg-primary border border-tertiary flex items-center justify-center">
        <Play className="size-8 text-tertiary" />
      </div>
      <Label.md className="text-center">{item.name}</Label.md>
      {item.duration && (
        <Paragraph.xs className="text-tertiary">
          Duration: {formatDuration(item.duration)}
        </Paragraph.xs>
      )}
      <audio key={item.id} src={item.url} controls preload="metadata" className="w-full" />
    </div>
  )
}

function SlidePreview({ item }: { item: MediaItem }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slides = item.slides ?? emptySlides

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handlePrevious = useCallback(() => {
    clearTimer()
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [clearTimer, slides.length])

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((value) => !value)
  }, [])

  const handleNext = useCallback(() => {
    clearTimer()
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }, [clearTimer, slides.length])

  useEffect(() => {
    if (!isPlaying || slides.length === 0) return clearTimer

    const slide = slides[currentIndex]
    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, slide.duration * 1000)

    return clearTimer
  }, [clearTimer, currentIndex, isPlaying, slides])

  if (slides.length === 0) {
    return <Paragraph.sm className="text-tertiary">No slides available</Paragraph.sm>
  }

  const current = slides[currentIndex]

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <div className="w-full aspect-video bg-primary rounded-lg overflow-hidden border border-tertiary">
        <img src={current.url} alt={`Slide ${currentIndex + 1}`} className="w-full h-full object-cover" />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button.Icon variant="ghost" icon={<SkipBack />} onClick={handlePrevious} />
        <Button.Icon variant="secondary" icon={isPlaying ? <Pause /> : <Play />} onClick={handlePlayToggle} />
        <Button.Icon variant="ghost" icon={<SkipForward />} onClick={handleNext} />
      </div>

      {item.audioUrl && <audio key={`${item.id}-audio`} src={item.audioUrl} controls preload="metadata" className="w-full max-w-md" />}

      <Paragraph.xs className="text-tertiary">
        Slide {currentIndex + 1} of {slides.length} &middot; {current.duration}s
      </Paragraph.xs>
    </div>
  )
}
