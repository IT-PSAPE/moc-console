import { CalendarRange, Package, User } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Booking } from '@moc/types/equipment'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'

export function BookingItemContent({ booking }: { booking: Booking }) {
    const checkedOut = formatUtcIsoInBrowserTimeZone(booking.checkedOutDate)
    const expectedReturn = formatUtcIsoInBrowserTimeZone(booking.expectedReturnAt)
    const itemCount = booking.items.length

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{booking.title}</ListItemCard.Title>
                {booking.notes && <ListItemCard.Subtitle>{booking.notes}</ListItemCard.Subtitle>}
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem icon={<User />}>{booking.bookedBy}</ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<CalendarRange />}>
                        {checkedOut} → {booking.returnedDate ? formatUtcIsoInBrowserTimeZone(booking.returnedDate) : expectedReturn}
                    </ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<Package />}>{itemCount} item{itemCount === 1 ? '' : 's'}</ListItemCard.MetaItem>
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
