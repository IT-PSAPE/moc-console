import { BroadcastNowPlaying } from "./broadcast-now-playing"
import { BroadcastPlaybackProvider } from "./broadcast-playback-provider"
import { BroadcastQueue } from "./broadcast-queue"
import { BroadcastMain, BroadcastScreen, BroadcastStage } from "./broadcast-stage"

export const BroadcastPlayer = {
  Main: BroadcastMain,
  NowPlaying: BroadcastNowPlaying,
  Queue: BroadcastQueue,
  Root: BroadcastPlaybackProvider,
  Screen: BroadcastScreen,
  Stage: BroadcastStage,
}
