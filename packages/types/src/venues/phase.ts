import type { VenueBookingPhase, VenueBookingStatus } from "./status";
import { getVenueBookingSeriesBounds, type VenueBookingOccurrence } from "./recurrence";

/**
 * The reader-facing status of a venue booking.
 *
 * This is the TypeScript twin of the `public.venue_booking_phase` SQL
 * function, and the two must stay in step: the database derives the phase for
 * tracking lookups and Telegram messages, and this derives it for the console.
 * Nothing stores the result, so a booking becomes "in progress" at its start
 * time with no job having to run.
 *
 * `at` is injectable so a list can derive every row against one instant
 * instead of drifting mid-render.
 */
export function deriveVenueBookingPhase(
  status: VenueBookingStatus,
  startsAt: string,
  endsAt: string,
  at: Date = new Date(),
): VenueBookingPhase {
  if (status === "cancelled") return "cancelled";

  const now = at.getTime();
  if (now >= new Date(endsAt).getTime()) return "completed";
  if (now >= new Date(startsAt).getTime()) return "in_progress";
  return "booked";
}

export function deriveVenueBookingSeriesPhase(
  status: VenueBookingStatus,
  occurrences: VenueBookingOccurrence[],
  at = new Date(),
  fallback?: { startsAt: string; endsAt: string },
): VenueBookingPhase {
  if (status === "cancelled") return "cancelled";
  if (occurrences.length === 0 && fallback) {
    const bounds = getVenueBookingSeriesBounds(occurrences, fallback.startsAt, fallback.endsAt);
    return deriveVenueBookingPhase(status, bounds.startsAt, bounds.endsAt, at);
  }
  if (occurrences.some((occurrence) => new Date(occurrence.startsAt) <= at && at < new Date(occurrence.endsAt))) return "in_progress";
  const lastOccurrence = occurrences[occurrences.length - 1];
  if (lastOccurrence && at >= new Date(lastOccurrence.endsAt)) return "completed";
  return "booked";
}
