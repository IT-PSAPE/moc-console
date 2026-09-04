import type { BroadcastItem } from "@moc/types/broadcast/broadcast"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { ListMusic } from "lucide-react"
import { useEffect, useRef } from "react"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastQueueItem } from "./broadcast-queue-item"

export function BroadcastQueue() {
  const { state, actions, meta } = useBroadcastPlaybackContext()
  const { broadcast } = meta
  const { activeItemId } = state
  const queueListRef = useRef<HTMLOListElement | null>(null)
  const itemCountLabel = `${broadcast.items.length} ${broadcast.items.length === 1 ? "item" : "items"}`

  useEffect(() => {
    const activeQueueItem = queueListRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
      ?? document.querySelector<HTMLElement>('[aria-current="true"]')
    activeQueueItem?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [activeItemId])

  function renderItem(item: BroadcastItem, index: number) {
    return (
      <BroadcastQueueItem
        key={item.id}
        index={index}
        isActive={item.id === activeItemId}
        item={item}
        kind={broadcast.kind}
        onSelect={actions.selectItem}
      />
    )
  }

  return (
    <aside className="flex min-h-0 min-w-0 max-w-full flex-col border-t border-secondary lg:border-t-0 lg:border-l" aria-label="Broadcast queue">
      <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
        <span className="text-tertiary *:size-4"><ListMusic aria-hidden="true" /></span>
        <Label.sm>Queue</Label.sm>
        <Paragraph.xs className="ml-auto text-quaternary">{itemCountLabel}</Paragraph.xs>
      </div>
      <ol
        ref={queueListRef}
        className="flex min-h-0 gap-1.5 overflow-x-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:flex-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
      >
        {broadcast.items.map(renderItem)}
      </ol>
    </aside>
  )
}
