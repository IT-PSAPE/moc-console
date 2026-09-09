import { supabase } from '@moc/data/supabase'
import { workspaceId } from '@/lib/workspace'
import type { VenueAvailabilitySlot } from '@/types/venue-booking'

type RawVenueAvailabilityRow = {
  venue_id: string
  venue_name: string
  slot_start: string
  slot_end: string
  available: boolean
  time_zone: string
}

function mapAvailabilityRow(row: RawVenueAvailabilityRow): VenueAvailabilitySlot {
  return {
    venueId: row.venue_id,
    venueName: row.venue_name,
    slotStart: row.slot_start,
    slotEnd: row.slot_end,
    available: row.available,
    timeZone: row.time_zone,
  }
}

export async function fetchVenueAvailability(venueId: string, date: string): Promise<VenueAvailabilitySlot[]> {
  const { data, error } = await supabase.rpc('public_venue_availability', {
    p_workspace_id: workspaceId,
    p_date: date,
    p_venue_id: venueId,
  })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawVenueAvailabilityRow[]).map(mapAvailabilityRow)
}
