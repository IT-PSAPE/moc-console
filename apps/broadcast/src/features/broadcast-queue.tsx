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
    const activeQueueItem = queueRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
    activeQueueItem?.scrollIntoView({ behavior: "smooth", block: "nearest" })
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
    <aside className="flex max-h-[42dvh] min-h-0 min-w-0 max-w-full flex-col gap-2 pt-[max(1.5rem,env(safe-area-inset-top))] lg:max-h-none pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-1" aria-label="Broadcast queue">
      <div className="px-1.5">
        <Label.sm className="block truncate">{broadcast.title}</Label.sm>
        <Paragraph.xs className="text-quaternary">{`Playlist · ${itemCountLabel}`}</Paragraph.xs>
      </div>
      <ol
        ref={queueRef}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
        style={getFadeStyle(edges.hasAbove, edges.hasBelow)}
      >
        {broadcast.items.map(renderItem)}
      </ol>
    </aside>
  )
}
