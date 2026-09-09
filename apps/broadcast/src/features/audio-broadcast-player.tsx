import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BroadcastArtwork } from "./broadcast-artwork"
import { BroadcastAudioDecks } from "./broadcast-audio-decks"
import { BroadcastPlayer } from "./broadcast-player"

export function AudioBroadcastPlayer({ broadcast }: { broadcast: Broadcast }) {
  return (
    <BroadcastPlayer.Root broadcast={broadcast}>
      <BroadcastPlayer.Stage>
        <BroadcastPlayer.Main>
          <BroadcastPlayer.Screen>
            <BroadcastArtwork />
          </BroadcastPlayer.Screen>
          <BroadcastPlayer.NowPlaying />
        </BroadcastPlayer.Main>
        <BroadcastPlayer.Queue />
      </BroadcastPlayer.Stage>
      <BroadcastAudioDecks />
    </BroadcastPlayer.Root>
  )
}
