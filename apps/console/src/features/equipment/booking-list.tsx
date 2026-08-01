import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import { BookingItem } from "./booking-item";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusGroup } from "@moc/types/equipment";

export function BookingListView({ bookings }: { bookings: Booking[] }) {
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
              <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
            </GroupedList.Header>
            <GroupedList.Content>
              {items.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </GroupedList.Content>
          </GroupedList.Group>
        );
      })}
    </GroupedList>
  );
}
