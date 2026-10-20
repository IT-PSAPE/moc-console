import { moc } from "@/lib/moc-client"
import type { Broadcast } from "@moc/types/broadcast/broadcast"

export function fetchBroadcasts(workspaceId: string): Promise<Broadcast[]> {
  return moc.broadcasts.list(workspaceId)
}
