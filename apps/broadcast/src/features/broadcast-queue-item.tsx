import type { BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { cn } from "@moc/utils/cn"
import { Music4, Play, Video } from "lucide-react"

type BroadcastQueueItemProps = {
  index: number
  isActive: boolean
  item: BroadcastItem
  kind: BroadcastKind
  onSelect: (itemId: string) => void
}

export function BroadcastQueueItem({ index, isActive, item, kind, onSelect }: BroadcastQueueItemProps) {
  function handleSelect() {
    onSelect(item.id)
  }

  function renderIcon() {
    if (isActive) return <Play className="fill-current" aria-hidden="true" />
    return kind === "audio" ? <Music4 aria-hidden="true" /> : <Video aria-hidden="true" />
  }

  return (
    <li className="w-56 shrink-0 lg:w-auto">
      <InteractiveSurface.Card
        aria-current={isActive ? "true" : undefined}
        className={cn("h-full rounded-md", isActive && "border-brand bg-primary_hover")}
        onClick={handleSelect}
      >
        <ListItemCard.Root className="items-center px-2 py-2 md:px-2">
          <ListItemCard.Leading className={cn("size-9", isActive && "bg-brand_solid text-primary_on-brand")}>
            {renderIcon()}
          </ListItemCard.Leading>
          <ListItemCard.Content>
            <ListItemCard.Title>{item.title}</ListItemCard.Title>
            <ListItemCard.Meta className="mt-0.5">
              <ListItemCard.MetaItem>{isActive ? "Now playing" : `Item ${index + 1}`}</ListItemCard.MetaItem>
            </ListItemCard.Meta>
          </ListItemCard.Content>
        </ListItemCard.Root>
      </InteractiveSurface.Card>
    </li>
  )
}
