import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { cn } from "@moc/utils/cn";

export function VenueBookingNotes({ booking, className }: { booking: VenueBooking; className?: string }) {
  if (!booking.notes) return null;
  return <div className={cn(className)}><Label.md className="block pb-3">Notes</Label.md><Paragraph.sm className="text-tertiary">{booking.notes}</Paragraph.sm></div>;
}
