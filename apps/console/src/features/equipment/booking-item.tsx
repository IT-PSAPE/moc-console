import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import type { Booking } from "@moc/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { BookingDrawer } from "./booking-drawer";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { CalendarRange, Package, User } from "lucide-react";

export function BookingItem({ booking, onDrawerOpenChange }: { booking: Booking; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    const checkedOut = formatUtcIsoInBrowserTimeZone(booking.checkedOutDate);
    const expectedReturn = formatUtcIsoInBrowserTimeZone(booking.expectedReturnAt);
    const itemCount = booking.items.length;

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.bookings}/${booking.id}`}>
                <ListItemCard.Root>
                    <ListItemCard.Content>
                        <ListItemCard.Title>{booking.title}</ListItemCard.Title>
                        {booking.notes && <ListItemCard.Subtitle>{booking.notes}</ListItemCard.Subtitle>}
                        <ListItemCard.Meta>
                            <ListItemCard.MetaItem icon={<User />}>{booking.bookedBy}</ListItemCard.MetaItem>
                            <ListItemCard.MetaItem icon={<CalendarRange />}>
                                {checkedOut} → {booking.returnedDate ? formatUtcIsoInBrowserTimeZone(booking.returnedDate) : expectedReturn}
                            </ListItemCard.MetaItem>
                            <ListItemCard.MetaItem icon={<Package />}>{itemCount} item{itemCount === 1 ? "" : "s"}</ListItemCard.MetaItem>
                        </ListItemCard.Meta>
                    </ListItemCard.Content>
                </ListItemCard.Root>
            </ResponsiveDrawerTrigger.Card>
            <BookingDrawer
                booking={booking}
                onBookingClose={handleClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
            />
        </Drawer>
    );
}
