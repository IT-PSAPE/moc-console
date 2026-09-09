import type { BroadcastItem } from "@moc/types/broadcast/broadcast"

export function getNextPlaybackIndex(total: number, activeIndex: number): number | null {
  if (total <= 0) {
    return null
  }

  return (activeIndex + 1) % total
}

export function getPreviousPlaybackIndex(total: number, activeIndex: number): number | null {
  if (total <= 0) {
    return null
  }

  return (activeIndex - 1 + total) % total
}

export function getPlaybackItemIndex(items: BroadcastItem[], activeItemId: string): number {
  return items.findIndex((item) => item.id === activeItemId)
}

export function getNextPlaybackItem(items: BroadcastItem[], activeItemId: string): BroadcastItem | null {
  if (items.length === 0) {
    return null
  }

  const activeIndex = getPlaybackItemIndex(items, activeItemId)
  const nextIndex = activeIndex < 0 ? 0 : getNextPlaybackIndex(items.length, activeIndex)

  return nextIndex === null ? null : (items[nextIndex] ?? null)
}

export function getPreviousPlaybackItem(items: BroadcastItem[], activeItemId: string): BroadcastItem | null {
  if (items.length === 0) {
    return null
  }

  const activeIndex = getPlaybackItemIndex(items, activeItemId)
  const previousIndex = activeIndex < 0 ? items.length - 1 : getPreviousPlaybackIndex(items.length, activeIndex)

  return previousIndex === null ? null : (items[previousIndex] ?? null)
}

export function getMediaSourceKey(item: BroadcastItem): string {
  return `${item.id}:${item.publicUrl}`
}
