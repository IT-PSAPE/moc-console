import { moc } from '@/lib/moc-client'
import { workspaceId } from '@/lib/workspace'
import type { VenueAvailabilitySlot } from '@/types/venue-booking'

export async function fetchVenueAvailability(venueId: string, date: string): Promise<VenueAvailabilitySlot[]> {
  return moc.publicSubmissions.getVenueAvailability(workspaceId, venueId, date)
}
