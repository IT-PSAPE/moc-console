import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { cn } from "@moc/utils/cn";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

/** Who/when/why a booking was cancelled. Renders nothing unless it was. */
export function VenueBookingCancellationAudit({ booking, className }: { booking: VenueBooking; className?: string }) {
  if (booking.status !== "cancelled") return null;

  return (
    <div className={cn(className)}>
      <Label.sm className="block pb-3 text-primary">Cancellation</Label.sm>
      <div className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
        {booking.cancelledAt && (
          <>
            <Label.sm className="text-tertiary">Cancelled</Label.sm>
            <Paragraph.sm className="text-primary">{formatUtcIsoInBrowserTimeZone(booking.cancelledAt)}</Paragraph.sm>
          </>
        )}
        <Label.sm className="text-tertiary">By</Label.sm>
        <Paragraph.sm className="text-primary">{booking.cancelledBy ?? "Unknown"}</Paragraph.sm>
        <Label.sm className="text-tertiary">Reason</Label.sm>
        <Paragraph.sm className="text-primary">{booking.cancelReason ?? "No reason given"}</Paragraph.sm>
      </div>
    </div>
  );
}
