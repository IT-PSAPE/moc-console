import { fetchItemMetadata, type BroadcastItemMetadata } from "@/data/fetch-item-metadata"
import type { BroadcastItem } from "@moc/types/broadcast/broadcast"
import { useEffect, useState } from "react"
import { formatItemTitle } from "./broadcast-format"

export type BroadcastItemDisplay = {
  artist: string | null
  coverUrl: string | null
  title: string
}

export type BroadcastMetadataMap = Map<string, BroadcastItemDisplay>

function toDisplay(item: BroadcastItem, metadata: BroadcastItemMetadata | undefined): BroadcastItemDisplay {
  return {
    artist: metadata?.artist ?? null,
    coverUrl: metadata?.coverUrl ?? null,
    // The embedded title wins over the stored one, which is only ever the
    // uploaded file name.
    title: metadata?.title?.trim() || formatItemTitle(item.title),
  }
}

/**
 * Reads embedded tags for every item in the playlist. Tags are fetched one at a
 * time so a long playlist does not open a request per item at once, and results
 * are cached by URL for the lifetime of the page.
 */
export function useBroadcastMetadata(items: BroadcastItem[]): BroadcastMetadataMap {
  const [metadataByUrl, setMetadataByUrl] = useState<Map<string, BroadcastItemMetadata>>(new Map())

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      for (const item of items) {
        const metadata = await fetchItemMetadata(item.publicUrl)

        if (cancelled) return

        setMetadataByUrl((current) => {
          if (current.get(item.publicUrl) === metadata) return current
          const next = new Map(current)
          next.set(item.publicUrl, metadata)
          return next
        })
      }
    }

    void loadAll()

    return () => {
      cancelled = true
    }
  }, [items])

  const display: BroadcastMetadataMap = new Map()

  for (const item of items) {
    display.set(item.id, toDisplay(item, metadataByUrl.get(item.publicUrl)))
  }

  return display
}
