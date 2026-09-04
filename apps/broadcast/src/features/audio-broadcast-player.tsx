import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BroadcastArtwork } from "./broadcast-artwork"
import { BroadcastAudioDecks } from "./broadcast-audio-decks"
import { BroadcastPlayer } from "./broadcast-player"

export function AudioBroadcastPlayer({ broadcast }: { broadcast: Broadcast }) {
  return (
    <BroadcastPlayer.Root broadcast={broadcast}>
      <BroadcastPlayer.Stage>
        <BroadcastPlayer.Main>
          <BroadcastPlayer.Header />
          <BroadcastPlayer.Screen>
            <BroadcastArtwork />
          </BroadcastPlayer.Screen>
          <BroadcastPlayer.Transport />
        </BroadcastPlayer.Main>
        <BroadcastPlayer.Queue />
      </BroadcastPlayer.Stage>
      <BroadcastAudioDecks />
    </BroadcastPlayer.Root>
  )
}
