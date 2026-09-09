import type { BroadcastItem } from "@moc/types/broadcast/broadcast"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { useEffect } from "react"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { BroadcastQueueItem } from "./broadcast-queue-item"
import { useScrollFade } from "./use-scroll-fade"

const FADE = "2rem"
const fadeStyles = {
  both: { maskImage: `linear-gradient(to bottom, transparent, black ${FADE}, black calc(100% - ${FADE}), transparent)` },
  above: { maskImage: `linear-gradient(to bottom, transparent, black ${FADE})` },
  below: { maskImage: `linear-gradient(to bottom, black calc(100% - ${FADE}), transparent)` },
  none: undefined,
} as const

function getFadeStyle(hasAbove: boolean, hasBelow: boolean) {
  if (hasAbove && hasBelow) return fadeStyles.both
  if (hasAbove) return fadeStyles.above
  if (hasBelow) return fadeStyles.below
  return fadeStyles.none
}

export function BroadcastQueue() {
  const { state, actions, meta } = useBroadcastPlaybackContext()
  const { broadcast, metadata } = meta
  const { activeItemId } = state
  const { selectItem } = actions
  const { edges, ref: queueRef } = useScrollFade<HTMLOListElement>()
  const itemCountLabel = `${broadcast.items.length} ${broadcast.items.length === 1 ? "item" : "items"}`

  useEffect(() => {
    const queue = queueRef.current
    const activeQueueItem = queue?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!queue || !activeQueueItem) return

    const queueBounds = queue.getBoundingClientRect()
    const itemBounds = activeQueueItem.getBoundingClientRect()
    const overflowAbove = itemBounds.top - queueBounds.top
    const overflowBelow = itemBounds.bottom - queueBounds.bottom

    // Scroll only the playlist; advancing tracks must not move the mobile player.
    if (overflowAbove < 0 || overflowBelow > 0) {
      queue.scrollBy({ top: overflowAbove < 0 ? overflowAbove : overflowBelow, behavior: "smooth" })
    }
  }, [activeItemId, queueRef])

  function renderItem(item: BroadcastItem) {
    const display = metadata.get(item.id)

    if (!display) return null

    return (
      <BroadcastQueueItem
        key={item.id}
        display={display}
        isActive={item.id === activeItemId}
        item={item}
        onSelect={selectItem}
      />
    )
  }

  return (
    <aside className="mx-auto flex max-h-[max(16rem,42dvh)] min-h-0 w-full min-w-0 max-w-112 flex-col gap-2 pt-2 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] lg:mx-0 lg:max-h-none lg:max-w-full lg:pt-[max(1.5rem,env(safe-area-inset-top))] lg:pl-1" aria-label="Broadcast queue">
      <div className="px-1.5">
        <Label.sm className="block truncate">{broadcast.title}</Label.sm>
        <Paragraph.xs className="text-quaternary">{`Playlist · ${itemCountLabel}`}</Paragraph.xs>
      </div>
      <ol
        ref={queueRef}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain"
        style={getFadeStyle(edges.hasAbove, edges.hasBelow)}
      >
        {broadcast.items.map(renderItem)}
      </ol>
    </aside>
  )
}
