// The text fields SET_FIELD/setField may touch directly. venueId, eventId,
// bookingDate and slotStarts are each mutated through their own dedicated
// action instead, since choosing a new venue or date invalidates the current
// slot selection and choosing a new event invalidates the "Other" text.
export type VenueBookingTextField = 'requestedBy' | 'eventOther'

export type VenueBookingFormData = {
  requestedBy: string
  venueId: string
  /**
   * A venue_events id, VENUE_EVENT_OTHER_ID, or '' when nothing is chosen
   * yet. "Other" is a sentinel rather than a row, so the submitted booking
   * sends no event id at all and carries eventOther instead.
   */
  eventId: string
  eventOther: string
  // Plain 'YYYY-MM-DD', interpreted by the backend in the workspace's own
  // time zone — see public_venue_availability / public_submit_venue_booking.
  bookingDate: string
  // ISO slot_start timestamps, chronological and contiguous.
  slotStarts: string[]
}

export type SubmitVenueBookingResult = {
  id: string
  trackingCode: string
  title: string
  startsAt: string
  endsAt: string
}

export type VenueAvailabilitySlot = {
  venueId: string
  venueName: string
  slotStart: string
  slotEnd: string
  available: boolean
  // The zone the slot grid was built in, reported by the RPC. Slots must be
  // LABELLED in this zone, not the visitor's: a device set to another zone
  // would otherwise show 16:00 for a slot that is 18:00 at the venue.
  timeZone: string
}
