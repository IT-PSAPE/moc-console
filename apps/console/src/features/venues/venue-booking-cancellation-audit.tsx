import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { cn } from "@moc/utils/cn";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

/** Who/when/why a booking was cancelled. Renders nothing unless it was. */
export function VenueBookingCancellationAudit({ booking, className }: { booking: VenueBooking; className?: string }) {
  if (booking.status !== "cancelled") return null;

  return (
    <div className={cn(className)}>
      <Label.md className="block pb-3">Cancellation</Label.md>
      <div className="space-y-3">
        {booking.cancelledAt && (
          <div><Label.sm className="text-primary">Cancelled: </Label.sm><Paragraph.sm className="inline text-tertiary">{formatUtcIsoInBrowserTimeZone(booking.cancelledAt)}</Paragraph.sm></div>
        )}
        <div><Label.sm className="text-primary">By: </Label.sm><Paragraph.sm className="inline text-tertiary">{booking.cancelledBy ?? "Unknown"}</Paragraph.sm></div>
        <div><Label.sm className="text-primary">Reason: </Label.sm><Paragraph.sm className="inline text-tertiary">{booking.cancelReason ?? "No reason given"}</Paragraph.sm></div>
      </div>
    </div>
  );
}
