import type { VenueBooking } from "@moc/types/venues"

export function matchesVenueBookingOptions(booking: VenueBooking, venueId: string | null, eventId: string | null) {
    return (!venueId || booking.venueId === venueId) && (!eventId || booking.eventId === eventId)
}
