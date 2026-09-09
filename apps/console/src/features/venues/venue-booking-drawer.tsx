import { Ban, EllipsisVertical, Maximize2, RotateCcw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Title } from "@moc/ui/components/display/text";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import type { VenueBooking } from "@moc/types/venues";
import { routes } from "@/screens/console-routes";
import { useDrawerClose } from "@/hooks/use-drawer-close";
import { VenueBookingFiveW } from "./venue-booking-five-w";
import { VenueBookingMetaFields } from "./venue-booking-meta-fields";
import { VenueBookingNotes } from "./venue-booking-notes";
import { VenueBookingCancellationAudit } from "./venue-booking-cancellation-audit";
import { VenueBookingCancelModal } from "./venue-booking-cancel-modal";
import { useVenueBookingCancel } from "./use-venue-booking-cancel";
import { useVenueBookings } from "./venue-bookings-provider";

export type VenueBookingDrawerProps = {
  booking: VenueBooking;
  onClose?: () => void;
};

export function VenueBookingDrawer({ booking, onClose }: VenueBookingDrawerProps) {
  const closeDrawer = useDrawerClose(onClose);

  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel aria-label={booking.title} className="max-w-lg">
        <VenueBookingPanelContent booking={booking} onClose={closeDrawer} />
      </Drawer.Panel>
    </Drawer.Portal>
  );
}

type VenueBookingPanelContentProps = {
  booking: VenueBooking;
  onClose: () => void;
};

export function VenueBookingPanelContent({ booking, onClose }: VenueBookingPanelContentProps) {
  const { state: { at } } = useVenueBookings();
  const cancel = useVenueBookingCancel();
  const isCancelled = booking.status === "cancelled";

  function handleOpenCancel() {
    cancel.actions.openCancelModal(booking);
  }

  function handleRestore() {
    void cancel.actions.restoreBooking(booking);
  }

  function handleCancelConfirm(reason: string) {
    void cancel.actions.confirmCancel(reason);
  }

  return (
    <>
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close booking" variant="ghost" icon={<X />} onClick={onClose} />
        <Button.IconLink aria-label="Open full page" variant="ghost" icon={<Maximize2 />} render={<Link to={`/${routes.venues}/${booking.id}`} />} />
        <div className="flex-1" />
        <Dropdown placement="bottom">
          <Dropdown.Trigger>
            <Button.Icon aria-label="More booking actions" variant="ghost" icon={<EllipsisVertical />} />
          </Dropdown.Trigger>
          <Dropdown.Panel>
            {isCancelled ? (
              <Dropdown.Item onSelect={handleRestore}>
                <RotateCcw className="size-4" />
                Restore booking
              </Dropdown.Item>
            ) : (
              <Dropdown.Item onSelect={handleOpenCancel}>
                <Ban className="size-4 text-utility-red-600" />
                <span className="text-utility-red-600">Cancel booking</span>
              </Dropdown.Item>
            )}
          </Dropdown.Panel>
        </Dropdown>
      </SplitPanel.Header>

      <SplitPanel.Content className="py-4">
        <div className="px-4 pb-4">
          <Title.h6>{booking.title}</Title.h6>
        </div>

        <div className="px-4">
          <VenueBookingMetaFields booking={booking} at={at} />
        </div>

        <Divider className="my-6" />
        <VenueBookingFiveW booking={booking} className="px-4" />

        {booking.notes && (
          <>
            <Divider className="my-6" />
            <VenueBookingNotes booking={booking} className="px-4" />
          </>
        )}

        {isCancelled && (
          <>
            <Divider className="my-6" />
            <VenueBookingCancellationAudit booking={booking} className="px-4" />
          </>
        )}
      </SplitPanel.Content>

      <VenueBookingCancelModal
        open={cancel.state.cancelTarget !== null}
        onCancel={cancel.actions.closeCancelModal}
        onConfirm={handleCancelConfirm}
        isCancelling={cancel.state.isSubmitting}
      />
    </>
  );
}
