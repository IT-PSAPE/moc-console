import { cn } from "@/utils/cn"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph } from "@/components/display/text"
import { playlistStatusColor, playlistStatusLabel } from "@/types/broadcast/constants"
import type { Playlist } from "@/types/broadcast/broadcast"
import { ListMusic } from "lucide-react"

type PlaylistListItemProps = {
  playlist: Playlist
  onClick: () => void
}

export function PlaylistListItem({ playlist, onClick }: PlaylistListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 bg-primary cursor-pointer transition-colors border rounded-md border-secondary",
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="size-10 shrink-0 rounded-md bg-secondary flex items-center justify-center">
        <ListMusic className="size-5 text-tertiary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Label.sm className="truncate block">{playlist.name}</Label.sm>
        <Paragraph.xs className="text-tertiary">{playlist.cues.length} cue{playlist.cues.length !== 1 ? "s" : ""}</Paragraph.xs>
      </div>

      {/* Status badge */}
      <Badge label={playlistStatusLabel[playlist.status]} color={playlistStatusColor[playlist.status]} />
    </div>
  )
}
