import { BroadcastHeader } from "./broadcast-header"
import { BroadcastPlaybackProvider } from "./broadcast-playback-provider"
import { BroadcastQueue } from "./broadcast-queue"
import { BroadcastMain, BroadcastScreen, BroadcastStage } from "./broadcast-stage"
import { BroadcastTransport } from "./broadcast-transport"

export const BroadcastPlayer = {
  Header: BroadcastHeader,
  Main: BroadcastMain,
  Queue: BroadcastQueue,
  Root: BroadcastPlaybackProvider,
  Screen: BroadcastScreen,
  Stage: BroadcastStage,
  Transport: BroadcastTransport,
}
