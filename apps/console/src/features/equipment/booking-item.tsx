import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { bookingStatusColor, bookingStatusLabel } from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { cn } from "@moc/utils/cn";
import { BookingDrawer } from "./booking-drawer";

const baseCard = "w-full bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors";

export function BookingItem({ booking, onDrawerOpenChange }: { booking: Booking; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    const checkedOut = formatUtcIsoInBrowserTimeZone(booking.checkedOutDate);
    const expectedReturn = formatUtcIsoInBrowserTimeZone(booking.expectedReturnAt);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <Drawer.Trigger>
                <div className={cn(baseCard, "flex items-start gap-3 p-3")}>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Label.sm className="truncate">{booking.equipmentName}</Label.sm>
                            <Badge label={bookingStatusLabel[booking.status]} color={bookingStatusColor[booking.status]} />
                        </div>
                        <Paragraph.xs className="block text-quaternary truncate">{booking.bookedBy}</Paragraph.xs>
                        <Paragraph.xs className="block text-quaternary mt-0.5 truncate">
                            {checkedOut} → {booking.returnedDate ? formatUtcIsoInBrowserTimeZone(booking.returnedDate) : expectedReturn}
                        </Paragraph.xs>
                    </div>
                </div>
            </Drawer.Trigger>
            <BookingDrawer
                booking={booking}
                onBookingClose={handleClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
            />
        </Drawer>
    );
}
