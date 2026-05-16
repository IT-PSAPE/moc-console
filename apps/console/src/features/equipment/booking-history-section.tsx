import { Accordion } from "@moc/ui/components/display/accordion";
import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import { ChevronDown, History } from "lucide-react";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

type BookingHistorySectionProps = {
  bookings: Booking[];
  isLoading: boolean;
};

export function BookingHistorySection({
  bookings,
  isLoading,
}: BookingHistorySectionProps) {
  return (
    <div className="px-4">
      <div className="flex items-center gap-2 pb-3">
        <History className="size-4 text-tertiary" />
        <Label.md>
          Booking History{bookings.length > 0 && ` (${bookings.length})`}
        </Label.md>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-6" />
      ) : bookings.length === 0 ? (
        <Paragraph.sm className="text-quaternary">
          No booking history
        </Paragraph.sm>
      ) : (
        <Accordion type="multiple">
          {bookings.map((booking) => (
            <BookingHistoryRow key={booking.id} booking={booking} />
          ))}
        </Accordion>
      )}
    </div>
  );
}

function BookingHistoryRow({ booking }: { booking: Booking }) {
  return (
    <Accordion.Item
      value={booking.id}
      className="border-b border-secondary last:border-b-0"
    >
      <Accordion.Trigger className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Label.sm>{booking.bookedBy}</Label.sm>
          <Paragraph.xs className="text-tertiary">
            {formatUtcIsoInBrowserTimeZone(booking.checkedOutDate, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Paragraph.xs>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
        </div>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="pb-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Paragraph.xs className="text-quaternary">Status:</Paragraph.xs>
            <Badge
              label={bookingStatusLabel[booking.status]}
              color={bookingStatusColor[booking.status]}
            />
          </div>
          {booking.returnedDate && (
            <div className="flex items-center gap-2">
              <Paragraph.xs className="text-quaternary">Returned:</Paragraph.xs>
              <Paragraph.xs>
                {formatUtcIsoInBrowserTimeZone(booking.returnedDate, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Paragraph.xs>
            </div>
          )}
          {!booking.returnedDate && (
            <div className="flex items-center gap-2">
              <Paragraph.xs className="text-quaternary">Expected:</Paragraph.xs>
              <Paragraph.xs>
                {formatUtcIsoInBrowserTimeZone(booking.expectedReturnAt)}
              </Paragraph.xs>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Paragraph.xs className="text-quaternary">Duration:</Paragraph.xs>
            <Paragraph.xs>{booking.duration}</Paragraph.xs>
          </div>
          {booking.notes && (
            <div className="flex items-center gap-2">
              <Paragraph.xs className="text-quaternary">Notes:</Paragraph.xs>
              <Paragraph.xs>{booking.notes}</Paragraph.xs>
            </div>
          )}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
