import { moc } from '@/lib/moc-client'
import { VENUE_EVENT_OTHER_ID } from '@moc/types/venues'
import { workspaceId } from '@/lib/workspace'
import type { VenueBookingFormData, SubmitVenueBookingResult } from '@/types/venue-booking'

export async function submitPublicVenueBooking(data: VenueBookingFormData): Promise<SubmitVenueBookingResult> {
  // "Other" is not a venue_events row: it submits no event id, and the typed
  // description becomes the booking's title instead.
  const isOtherEvent = data.eventId === VENUE_EVENT_OTHER_ID

  const result = await moc.publicSubmissions.submitVenueBooking(workspaceId, {
    venueId: data.venueId,
    requestedBy: data.requestedBy,
    slotStarts: data.slotStarts,
    eventId: isOtherEvent ? null : data.eventId || null,
    eventOther: isOtherEvent ? data.eventOther : null,
    recurrence: data.recurrence,
  })
  moc.publicSubmissions.notifyCreated('venue-booking', result.id, result.trackingCode)
  return result
}
