// The text fields SET_FIELD/setField may touch directly. venueId, bookingDate
// and slotStarts are each mutated through their own dedicated action instead,
// since choosing a new venue or date invalidates the current slot selection.
export type VenueBookingTextField = 'title' | 'requestedBy' | 'who' | 'what' | 'whenText' | 'whereText' | 'why' | 'how' | 'notes'

export type VenueBookingFormData = {
  title: string
  requestedBy: string
  who: string
  what: string
  whenText: string
  whereText: string
  why: string
  how: string
  notes: string
  venueId: string
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
