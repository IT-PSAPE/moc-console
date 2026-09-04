import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface"
import { BroadcastItemContent } from "./broadcast-item-content"

type BroadcastItemProps = {
  broadcast: Broadcast
  onSelect: (broadcast: Broadcast) => void
}

export function BroadcastItem({ broadcast, onSelect }: BroadcastItemProps) {
  function handleSelect() {
    onSelect(broadcast)
  }

  return (
    <InteractiveSurface.Card onClick={handleSelect}>
      <BroadcastItemContent broadcast={broadcast} />
    </InteractiveSurface.Card>
  )
}
