import { moc } from '@/lib/moc-client'
import { workspaceId } from '@/lib/workspace'
import type { PublicVenueEvent } from '@moc/types/venues'

export async function fetchPublicVenueEvents(): Promise<PublicVenueEvent[]> {
  return moc.publicSubmissions.listVenueEvents(workspaceId)
}
