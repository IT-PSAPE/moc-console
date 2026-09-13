import { supabase } from '@moc/data/supabase'
import { VENUE_EVENT_OTHER_ID } from '@moc/types/venues'
import { wakeVenueBookingCreatedNotification } from '@/data/notify-event'
import { workspaceId } from '@/lib/workspace'
import type { VenueBookingFormData, SubmitVenueBookingResult } from '@/types/venue-booking'

export async function submitPublicVenueBooking(data: VenueBookingFormData): Promise<SubmitVenueBookingResult> {
  // "Other" is not a venue_events row: it submits no event id, and the typed
  // description becomes the booking's title instead.
  const isOtherEvent = data.eventId === VENUE_EVENT_OTHER_ID

  const { data: result, error } = await supabase.rpc('public_submit_venue_booking', {
    p_workspace_id: workspaceId,
    p_venue_id: data.venueId,
    p_requested_by: data.requestedBy,
    p_slot_starts: data.slotStarts,
    p_event_id: isOtherEvent ? null : data.eventId,
    p_event_other: isOtherEvent ? data.eventOther : null,
  })

  if (error) throw new Error(error.message)

  wakeVenueBookingCreatedNotification(result.id, result.tracking_code)

  return {
    id: result.id,
    trackingCode: result.tracking_code,
    title: result.title,
    startsAt: result.starts_at,
    endsAt: result.ends_at,
  }
}
