import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { Label } from "@/components/display/text";
import { BookingItem } from "./booking-item";
import type { Booking } from "@/types/equipment";
import { bookingStatusGroup } from "@/types/equipment";

export function BookingListView({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="flex flex-col gap-4">
      {bookingStatusGroup.map((group) => {
        const items = bookings.filter((b) => b.status === group.key);
        if (items.length === 0) return null;
        return (
          <Card key={group.key}>
            <Card.Header tight className="gap-1.5">
              <Indicator color={group.color} className="size-6" />
              <Label.sm>{group.label}</Label.sm>
              <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
            </Card.Header>
            <Card.Content ghost className="flex flex-col gap-1.5">
              {items.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}
