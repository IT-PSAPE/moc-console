import { BroadcastActiveWorkspace } from './broadcast-active-workspace'
import { BroadcastMediaBin } from './broadcast-media-bin'
import { BroadcastQueuePanel } from './broadcast-queue-panel'
import { BroadcastWorkspaceRoot } from './broadcast-workspace-root'
import { BroadcastWorkspaceSelector } from './broadcast-workspace-selector'

export const BroadcastWorkspace = {
  Root: BroadcastWorkspaceRoot,
  MediaBin: BroadcastMediaBin,
  Workspace: BroadcastActiveWorkspace,
  Queue: BroadcastQueuePanel,
  Selector: BroadcastWorkspaceSelector,
}
