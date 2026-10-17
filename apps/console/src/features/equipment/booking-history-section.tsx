import { Badge } from "@moc/ui/components/display/badge";
import { DividedList } from "@moc/ui/components/display/divided-list";
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface";
import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

type BookingHistorySectionProps = {
  bookings: Booking[];
  isLoading: boolean;
  onNavigate?: () => void;
};

export function BookingHistorySection({
  bookings,
  isLoading,
  onNavigate,
}: BookingHistorySectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 pb-3">
        <History className="size-4 text-tertiary" />
        <Label.sm className="text-primary">
          Booking History{bookings.length > 0 && ` (${bookings.length})`}
        </Label.sm>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-6" />
      ) : bookings.length === 0 ? (
        <Paragraph.sm className="text-quaternary">
          No booking history
        </Paragraph.sm>
      ) : (
        <DividedList>
          {bookings.map((booking) => (
            <BookingHistoryRow key={booking.id} booking={booking} onNavigate={onNavigate} />
          ))}
        </DividedList>
      )}
    </div>
  );
}

function BookingHistoryRow({ booking, onNavigate }: { booking: Booking; onNavigate?: () => void }) {
  return (
    <InteractiveSurface.CardLink render={<Link to={`/bookings/${booking.id}`} onClick={onNavigate} />} aria-label={booking.title}>
      <ListItemCard.Root>
        <ListItemCard.Content>
          <ListItemCard.Title>{booking.title}</ListItemCard.Title>
          <ListItemCard.Subtitle>{booking.bookedBy}</ListItemCard.Subtitle>
        </ListItemCard.Content>
        <ListItemCard.Trailing>
          <Badge label={bookingStatusLabel[booking.status]} color={bookingStatusColor[booking.status]} />
          <Paragraph.xs className="whitespace-nowrap text-tertiary">
            {formatUtcIsoInBrowserTimeZone(booking.checkedOutDate, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Paragraph.xs>
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    </InteractiveSurface.CardLink>
  );
}
