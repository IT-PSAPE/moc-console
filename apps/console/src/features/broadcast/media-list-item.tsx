import { cn } from "@moc/utils/cn"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { mediaTypeColor, mediaTypeLabel } from "@moc/types/broadcast/constants"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import { Image, Music, Video } from "lucide-react"
import type { MediaType } from "@moc/types/broadcast/media-type"

const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <Image />,
  audio: <Music />,
  video: <Video />,
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`
}

type MediaListItemProps = {
  item: MediaItem
  onClick: () => void
}

export function MediaListItem({ item, onClick }: MediaListItemProps) {
  const duration = item.duration

  return (
    <div
      className={cn( "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-secondary hover:bg-primary_hover")}
      onClick={onClick}
    >
      {/* Thumbnail / Icon */}
      <div className="size-10 shrink-0 rounded-md bg-secondary flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} className="size-full object-cover" />
        ) : (
          <span className="text-tertiary *:size-5">{mediaTypeIcon[item.type]}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Label.sm className="truncate block">{item.name}</Label.sm>
        {duration != null && (
          <Paragraph.xs className="text-tertiary">{formatDuration(duration)}</Paragraph.xs>
        )}
      </div>

      {/* Type badge */}
      <Badge
        icon={mediaTypeIcon[item.type]}
        label={mediaTypeLabel[item.type]}
        color={mediaTypeColor[item.type]}
      />
    </div>
  )
}
