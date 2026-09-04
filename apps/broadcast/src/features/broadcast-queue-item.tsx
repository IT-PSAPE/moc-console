import type { BroadcastItem } from "@moc/types/broadcast/broadcast"
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { cn } from "@moc/utils/cn"
import { BroadcastCover } from "./broadcast-cover"
import type { BroadcastItemDisplay } from "./use-broadcast-metadata"

type BroadcastQueueItemProps = {
  display: BroadcastItemDisplay
  isActive: boolean
  item: BroadcastItem
  onSelect: (itemId: string) => void
}

export function BroadcastQueueItem({ display, isActive, item, onSelect }: BroadcastQueueItemProps) {
  function handleSelect() {
    onSelect(item.id)
  }

  return (
    <li>
      <InteractiveSurface
        aria-current={isActive ? "true" : undefined}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-secondary"
        onClick={handleSelect}
      >
        <BroadcastCover className="size-10 rounded-md" coverUrl={display.coverUrl} iconClassName="size-4" title={display.title} />
        <span className="min-w-0 flex-1">
          <Label.sm className={cn("block truncate", isActive ? "text-brand_secondary" : "text-primary")}>{display.title}</Label.sm>
          {display.artist ? <Paragraph.xs className="block truncate text-quaternary">{display.artist}</Paragraph.xs> : null}
        </span>
      </InteractiveSurface>
    </li>
  )
}
