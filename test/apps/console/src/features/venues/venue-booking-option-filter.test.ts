import { expect, test } from "vitest"
import type { VenueBooking } from "../../../../../../packages/types/src/venues/venue-booking"
import { matchesVenueBookingOptions } from "../../../../../../apps/console/src/features/venues/venue-booking-option-filter"

function booking(overrides: Partial<VenueBooking> = {}): VenueBooking {
    return {
        id: "booking",
        workspaceId: "workspace",
        venueId: "venue-a",
        venueName: "Main hall",
        venueDescription: null,
        eventId: "event-a",
        eventName: "Screening",
        eventOther: null,
        trackingCode: "VEN-ABC123",
        title: "Screening",
        requestedBy: "Jordan",
        status: "auto",
        startsAt: "2026-10-14T08:00:00.000Z",
        endsAt: "2026-10-14T09:00:00.000Z",
        recurrence: null,
        occurrences: [],
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        createdAt: "2026-10-01T08:00:00.000Z",
        updatedAt: "2026-10-01T08:00:00.000Z",
        ...overrides,
    }
}

test("venue and event type filters compose and allow clearing either option", () => {
    const matching = booking()
    const otherVenue = booking({ id: "other-venue", venueId: "venue-b" })
    const otherEvent = booking({ id: "other-event", eventId: "event-b" })

    expect([matching, otherVenue, otherEvent].filter((item) => matchesVenueBookingOptions(item, "venue-a", "event-a"))).toEqual([matching])
    expect(matchesVenueBookingOptions(otherEvent, "venue-a", null)).toBe(true)
    expect(matchesVenueBookingOptions(otherVenue, null, "event-a")).toBe(true)
    expect(matchesVenueBookingOptions(matching, null, null)).toBe(true)
})
