import { useEffect } from "react"
import { useVenueBookingFilters } from "@/features/venues/use-venue-booking-filters"
import { useVenueBookings } from "@/features/venues/venue-bookings-provider"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"
import type { VenueBooking } from "@moc/types/venues"
import { useListDetailSelection } from "@/hooks/use-list-detail-selection"

const venueBookingViews = ["list", "kanban", "calendar"] as const

export function useVenueBookingsScreen() {
  const [view, setView] = useViewQuery(venueBookingViews, "list")
  const isMobile = useIsMobile()
  const activeView = isMobile && view === "kanban" ? "list" : view
  const {
    state: { bookings, isLoading },
    actions: { loadBookings },
  } = useVenueBookings()
  const filters = useVenueBookingFilters(bookings)
  const detail = useListDetailSelection<VenueBooking>(bookings)
  const { close: closeDetail, select: selectBooking } = detail.actions

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  useEffect(() => {
    if (activeView !== "list") closeDetail()
  }, [activeView, closeDetail])

  function changeView(value: string) {
    setView(value)
  }

  return {
    state: { detailOpen: detail.state.isOpen, selectedBooking: detail.state.selectedItem },
    actions: { changeView, closeDetail, selectBooking },
    meta: {
      filters,
      activeView,
      isMobile,
      isLoading,
    },
  }
}
