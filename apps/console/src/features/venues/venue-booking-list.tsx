import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { deriveVenueBookingPhase, venueBookingPhaseGroups } from "@moc/types/venues";
import { ResponsiveDetailAction } from "@/features/responsive-detail-action";
import { routes } from "@/screens/console-routes";
import { VenueBookingItemContent } from "./venue-booking-item-content";
import { useVenueBookings } from "./venue-bookings-provider";

export function VenueBookingListView({ onSelect, bookings }: { onSelect: (booking: VenueBooking) => void; bookings: VenueBooking[] }) {
    const { state: { at } } = useVenueBookings();

    function renderBooking(booking: VenueBooking) {
        function handleSelect() {
            onSelect(booking)
        }

        return (
            <ResponsiveDetailAction.Card key={booking.id} mobileHref={`/${routes.venues}/${booking.id}`} onActivate={handleSelect}>
                <VenueBookingItemContent booking={booking} />
            </ResponsiveDetailAction.Card>
        )
    }

    return (
        <GroupedList>
            {venueBookingPhaseGroups.map((group) => {
                const items = bookings.filter((booking) => deriveVenueBookingPhase(booking.status, booking.startsAt, booking.endsAt, at) === group.key);
                if (items.length === 0) return null;
                return (
                    <GroupedList.Group key={group.key}>
                        <GroupedList.Header>
                            <Indicator color={group.color} className='size-6' />
                            <Label.sm>{group.label}</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                            {items.map(renderBooking)}
                        </GroupedList.Content>
                    </GroupedList.Group>
                );
            })}
        </GroupedList>
    )
}
