import { moc } from '@/lib/moc-client'
import { workspaceId } from '@/lib/workspace'
import type { PublicVenue } from '@moc/types/venues'

export async function fetchPublicVenues(): Promise<PublicVenue[]> {
  return moc.publicSubmissions.listVenues(workspaceId)
}
