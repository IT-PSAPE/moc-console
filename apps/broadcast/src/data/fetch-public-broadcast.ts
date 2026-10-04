import { moc } from "@/lib/moc-client"
import type { Broadcast } from "@moc/types/broadcast/broadcast"

export function fetchPublicBroadcast(slug: string): Promise<Broadcast | null> {
  return moc.broadcasts.getPublicBySlug(slug)
}

export function fetchBroadcastById(id: string): Promise<Broadcast | null> {
  return moc.broadcasts.getPublicById(id)
}
