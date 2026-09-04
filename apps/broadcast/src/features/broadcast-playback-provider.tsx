import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { createContext, useContext, type ReactNode } from "react"
import { useBroadcastPlayback } from "./use-broadcast-playback"
import { useBroadcastMetadata, type BroadcastItemDisplay, type BroadcastMetadataMap } from "./use-broadcast-metadata"

type BroadcastPlaybackContextValue = ReturnType<typeof useBroadcastPlayback> & {
  meta: {
    broadcast: Broadcast
    metadata: BroadcastMetadataMap
  }
}

const BroadcastPlaybackContext = createContext<BroadcastPlaybackContextValue | null>(null)

export function BroadcastPlaybackProvider({ broadcast, children }: { broadcast: Broadcast; children: ReactNode }) {
  const playback = useBroadcastPlayback(broadcast)
  const metadata = useBroadcastMetadata(broadcast.items)

  return (
    <BroadcastPlaybackContext.Provider value={{ ...playback, meta: { broadcast, metadata } }}>
      {children}
    </BroadcastPlaybackContext.Provider>
  )
}

export function useBroadcastPlaybackContext() {
  const context = useContext(BroadcastPlaybackContext)

  if (!context) {
    throw new Error("Broadcast player parts must be used within BroadcastPlayer.Root")
  }

  return context
}

/** Display metadata for one item, falling back to its stored file name. */
export function useBroadcastItemDisplay(itemId: string | undefined): BroadcastItemDisplay | null {
  const { meta } = useBroadcastPlaybackContext()

  return itemId ? meta.metadata.get(itemId) ?? null : null
}
