import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { bookingStatusColor, bookingStatusLabel } from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { BookingDrawer } from "./booking-drawer";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

export function BookingItem({ booking, onDrawerOpenChange }: { booking: Booking; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    const checkedOut = formatUtcIsoInBrowserTimeZone(booking.checkedOutDate);
    const expectedReturn = formatUtcIsoInBrowserTimeZone(booking.expectedReturnAt);
    const itemCount = booking.items.length;

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.bookings}/${booking.id}`} className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Label.sm className="truncate">{booking.title}</Label.sm>
                            <Badge label={bookingStatusLabel[booking.status]} color={bookingStatusColor[booking.status]} />
                        </div>
                        <Paragraph.xs className="block text-quaternary truncate">{booking.bookedBy}</Paragraph.xs>
                        <Paragraph.xs className="block text-quaternary mt-0.5 truncate">
                            {checkedOut} → {booking.returnedDate ? formatUtcIsoInBrowserTimeZone(booking.returnedDate) : expectedReturn} · {itemCount} item{itemCount === 1 ? "" : "s"}
                        </Paragraph.xs>
                    </div>
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
