import { describe, expect, test } from "bun:test";
import type { VenueBooking } from "@moc/types/venues";
import { venueBookingOverlapsDateRange } from "./venue-booking-date-range";

function booking(occurrences: VenueBooking["occurrences"]): VenueBooking {
  return {
    id: "booking", workspaceId: "workspace", venueId: "venue", venueName: "Hall", venueDescription: null,
    eventId: null, eventName: null, eventOther: "Rehearsal", trackingCode: "VEN-ABC123", title: "Rehearsal",
    requestedBy: "Craig", notes: null, status: "auto", startsAt: "2026-09-01T10:00:00.000Z",
    endsAt: "2026-09-01T11:00:00.000Z", recurrence: null, occurrences, cancelledAt: null,
    cancelledBy: null, cancelReason: null, approvedAt: null, approvedBy: null, rejectedAt: null, rejectedBy: null, createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z",
  };
}

describe("venueBookingOverlapsDateRange", () => {
  test("includes a series when a later occurrence overlaps the range", () => {
    const value = booking([
      { index: 0, startsAt: "2026-09-01T10:00:00.000Z", endsAt: "2026-09-01T11:00:00.000Z" },
      { index: 1, startsAt: "2026-11-03T10:00:00.000Z", endsAt: "2026-11-03T11:00:00.000Z" },
    ]);
    expect(venueBookingOverlapsDateRange(value, { start: "2026-11-01", end: "2026-11-30" })).toBe(true);
    expect(venueBookingOverlapsDateRange(value, { start: "2026-10-01", end: "2026-10-31" })).toBe(false);
  });

  test("uses the parent window for legacy rows without embedded slots", () => {
    expect(venueBookingOverlapsDateRange(booking([]), { start: "2026-09-01", end: "2026-09-01" })).toBe(true);
  });
});
