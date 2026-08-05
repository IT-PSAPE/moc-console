import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import type { Booking } from "@moc/types/equipment";
import { BookingDrawer } from "./booking-drawer";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { BookingItemContent } from "./booking-item-content";

export function BookingItem({ booking, onDrawerOpenChange }: { booking: Booking; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.bookings}/${booking.id}`}>
                <BookingItemContent booking={booking} />
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
