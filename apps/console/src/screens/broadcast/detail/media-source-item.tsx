import { useCallback } from "react"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Label } from "@moc/ui/components/display/text"
import { mediaTypeColor, mediaTypeLabel } from "@moc/types/broadcast"
import type { MediaItem } from "@moc/types/broadcast"
import { Plus } from "lucide-react"
import { mediaTypeIcon } from "./media-type-icon"

type MediaSourceItemProps = { item: MediaItem; onAdd: (item: MediaItem) => void }

export function MediaSourceItem({ item, onAdd }: MediaSourceItemProps) {
  const handleAdd = useCallback(() => {
    onAdd(item)
  }, [item, onAdd])

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-primary_hover transition-colors border-b border-secondary">
      <div className="size-8 shrink-0 rounded bg-secondary flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} className="size-full object-cover" />
        ) : (
          <span className="text-tertiary *:size-4">{mediaTypeIcon[item.type]}</span>
        )}
      </div>
      <Label.sm className="flex-1 truncate">{item.name}</Label.sm>
      <Badge label={mediaTypeLabel[item.type]} color={mediaTypeColor[item.type]} />
      <Button.Icon
        variant="ghost"
        icon={<Plus />}
        onClick={handleAdd}
        aria-label={`Add ${item.name} to timeline`}
      />
    </div>
  )
}
