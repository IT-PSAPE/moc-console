import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BroadcastPlayer } from "./broadcast-player"
import { BroadcastVideoDecks } from "./broadcast-video-decks"

export function VideoBroadcastPlayer({ broadcast }: { broadcast: Broadcast }) {
  return (
    <BroadcastPlayer.Root broadcast={broadcast}>
      <BroadcastPlayer.Stage>
        <BroadcastPlayer.Main>
          <BroadcastPlayer.Header />
          <BroadcastPlayer.Screen>
            <BroadcastVideoDecks />
          </BroadcastPlayer.Screen>
          <BroadcastPlayer.Transport />
        </BroadcastPlayer.Main>
        <BroadcastPlayer.Queue />
      </BroadcastPlayer.Stage>
    </BroadcastPlayer.Root>
  )
}
