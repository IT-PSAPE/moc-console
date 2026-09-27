import type { VenueBooking } from "@moc/types/venues";

type DateRange = { start: string; end: string };

export function venueBookingOverlapsDateRange(booking: VenueBooking, range: DateRange): boolean {
  if (!range.start && !range.end) return true;

  const rangeStart = range.start ? new Date(`${range.start}T00:00:00.000`) : null;
  const rangeEnd = range.end ? new Date(`${range.end}T23:59:59.999`) : null;
  const occurrences = booking.occurrences.length > 0 ? booking.occurrences : [booking];

  return occurrences.some((occurrence) => {
    const startsAt = new Date(occurrence.startsAt);
    const endsAt = new Date(occurrence.endsAt);
    return (!rangeStart || endsAt >= rangeStart) && (!rangeEnd || startsAt <= rangeEnd);
  });
}
