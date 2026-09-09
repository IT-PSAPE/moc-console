import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusGroup } from "@moc/types/equipment";
import { ResponsiveDetailAction } from "@/features/responsive-detail-action";
import { routes } from "@/screens/console-routes";
import { BookingItemContent } from "./booking-item-content";

export function BookingListView({ bookings, onSelect }: { bookings: Booking[]; onSelect: (booking: Booking) => void }) {
  function renderBooking(booking: Booking) {
    function handleSelect() {
      onSelect(booking)
    }

    return (
      <ResponsiveDetailAction.Card key={booking.id} mobileHref={`/${routes.bookings}/${booking.id}`} onActivate={handleSelect}>
        <BookingItemContent booking={booking} />
      </ResponsiveDetailAction.Card>
    )
  }

  return (
    <GroupedList>
      {bookingStatusGroup.map((group) => {
        const items = bookings.filter((b) => b.status === group.key);
        if (items.length === 0) return null;
        return (
          <GroupedList.Group key={group.key}>
            <GroupedList.Header>
              <Indicator color={group.color} className="size-6" />
              <Label.sm>{group.label}</Label.sm>
            </GroupedList.Header>
            <GroupedList.Content>
              {items.map(renderBooking)}
            </GroupedList.Content>
          </GroupedList.Group>
        );
      })}
    </GroupedList>
  );
}
