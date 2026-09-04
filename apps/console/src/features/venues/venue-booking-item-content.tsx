import { CalendarClock, Ticket, User } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { VenueBooking } from '@moc/types/venues'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'

export function VenueBookingItemContent({ booking }: { booking: VenueBooking }) {
    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{booking.title}</ListItemCard.Title>
                <ListItemCard.Subtitle>{booking.venueLocation ? `${booking.venueName} · ${booking.venueLocation}` : booking.venueName}</ListItemCard.Subtitle>
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem icon={<CalendarClock />}>
                        {formatUtcIsoInBrowserTimeZone(booking.startsAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<User />}>{booking.requestedBy}</ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<Ticket />}>{booking.trackingCode}</ListItemCard.MetaItem>
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
