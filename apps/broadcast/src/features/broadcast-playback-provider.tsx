import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { createContext, useContext, type ReactNode } from "react"
import { useBroadcastPlayback } from "./use-broadcast-playback"

type BroadcastPlaybackContextValue = ReturnType<typeof useBroadcastPlayback> & {
  meta: { broadcast: Broadcast }
}

const BroadcastPlaybackContext = createContext<BroadcastPlaybackContextValue | null>(null)

export function BroadcastPlaybackProvider({ broadcast, children }: { broadcast: Broadcast; children: ReactNode }) {
  const playback = useBroadcastPlayback(broadcast)

  return (
    <BroadcastPlaybackContext.Provider value={{ ...playback, meta: { broadcast } }}>
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
