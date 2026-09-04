import type { VenueBookingPhase, VenueBookingStatus } from "./status";

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
