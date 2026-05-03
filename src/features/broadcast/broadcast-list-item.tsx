import { useState } from "react"
import { cn } from "@/utils/cn"
import { Badge } from "@/components/display/badge"
import { Drawer } from "@/components/overlays/drawer"
import { Label, Paragraph } from "@/components/display/text"
import { playlistStatusColor, playlistStatusLabel } from "@/types/broadcast/constants"
import type { Playlist } from "@/types/broadcast/broadcast"
import { ListMusic } from "lucide-react"
import { PlaylistDetailDrawer } from "./playlist-detail-drawer"

type PlaylistListItemProps = {
  playlist: Playlist
}

export function PlaylistListItem({ playlist }: PlaylistListItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 bg-primary cursor-pointer transition-colors border rounded-md border-secondary hover:bg-background-primary-hover",
          )}
        >
          <div className="size-10 shrink-0 rounded-md bg-secondary flex items-center justify-center">
            <ListMusic className="size-5 text-tertiary" />
          </div>

          <div className="flex-1 min-w-0">
            <Label.sm className="truncate block">{playlist.name}</Label.sm>
            <Paragraph.xs className="text-tertiary">{playlist.cues.length} cue{playlist.cues.length !== 1 ? "s" : ""}</Paragraph.xs>
          </div>

          <Badge label={playlistStatusLabel[playlist.status]} color={playlistStatusColor[playlist.status]} />
        </div>
      </Drawer.Trigger>
      <PlaylistDetailDrawer playlist={playlist} />
    </Drawer.Root>
  )
}
