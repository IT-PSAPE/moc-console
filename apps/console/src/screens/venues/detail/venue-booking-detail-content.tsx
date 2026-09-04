import { Ban, EllipsisVertical, RotateCcw } from "lucide-react"
import { Link } from "react-router-dom"
import { VenueBookingFiveW } from "@/features/venues/venue-booking-five-w"
import { VenueBookingMetaFields } from "@/features/venues/venue-booking-meta-fields"
import { VenueBookingNotes } from "@/features/venues/venue-booking-notes"
import { VenueBookingCancellationAudit } from "@/features/venues/venue-booking-cancellation-audit"
import { VenueBookingCancelModal } from "@/features/venues/venue-booking-cancel-modal"
import { useVenueBookingCancel } from "@/features/venues/use-venue-booking-cancel"
import { useVenueBookings } from "@/features/venues/venue-bookings-provider"
import { TopBarActions } from "@/features/topbar"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Header } from "@moc/ui/components/display/header"
import { Page } from "@moc/ui/components/layout/page"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import type { VenueBooking } from "@moc/types/venues"

type VenueBookingDetailContentProps = {
  booking: VenueBooking
}

export function VenueBookingDetailContent({ booking }: VenueBookingDetailContentProps) {
  const { state: { at } } = useVenueBookings()
  const cancel = useVenueBookingCancel()
  const isCancelled = booking.status === "cancelled"

  function handleOpenCancel() {
    cancel.actions.openCancelModal(booking)
  }

  function handleRestore() {
    void cancel.actions.restoreBooking(booking)
  }

  function handleCancelConfirm(reason: string) {
    void cancel.actions.confirmCancel(reason)
  }

  return (
    <DetailPage>
      <DetailPage.Back render={<Link to={`/${routes.venues}`} />}>Back to venue bookings</DetailPage.Back>

      <TopBarActions>
        <Dropdown placement="bottom">
          <Dropdown.Trigger><Button.Icon aria-label="More booking actions" variant="secondary" icon={<EllipsisVertical />} /></Dropdown.Trigger>
          <Dropdown.Panel>
            {isCancelled ? (
              <Dropdown.Item onSelect={handleRestore}><RotateCcw className="size-4" />Restore booking</Dropdown.Item>
            ) : (
              <Dropdown.Item onSelect={handleOpenCancel}><Ban className="size-4 text-utility-red-600" /><span className="text-utility-red-600">Cancel booking</span></Dropdown.Item>
            )}
          </Dropdown.Panel>
        </Dropdown>
      </TopBarActions>

      <DetailPage.Header><Header.Lead className="gap-2"><Page.Title>{booking.title}</Page.Title></Header.Lead></DetailPage.Header>
      <DetailPage.Section><VenueBookingMetaFields booking={booking} at={at} /></DetailPage.Section>
      <DetailPage.Divider />
      <DetailPage.Section><VenueBookingFiveW booking={booking} /></DetailPage.Section>
      {booking.notes && <><DetailPage.Divider /><DetailPage.Section><VenueBookingNotes booking={booking} /></DetailPage.Section></>}
      {isCancelled && <><DetailPage.Divider /><DetailPage.Section><VenueBookingCancellationAudit booking={booking} /></DetailPage.Section></>}

      <VenueBookingCancelModal
        open={cancel.state.cancelTarget !== null}
        onCancel={cancel.actions.closeCancelModal}
        onConfirm={handleCancelConfirm}
        isCancelling={cancel.state.isSubmitting}
      />
    </DetailPage>
  )
}
