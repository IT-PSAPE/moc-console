import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { VenueBooking } from "@moc/types/venues";
import { VenueBookingDrawer } from "./venue-booking-drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { VenueBookingItemContent } from "./venue-booking-item-content";

export function VenueBookingItem({ booking, onDrawerOpenChange }: { booking: VenueBooking; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, handleClose, handleOpenChange } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.venues}/${booking.id}`}>
                <VenueBookingItemContent booking={booking} />
            </ResponsiveDrawerTrigger.Card>
            <VenueBookingDrawer booking={booking} onClose={handleClose} />
        </Drawer>
    )
}
