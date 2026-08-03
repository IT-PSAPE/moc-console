import { useEffect } from "react"
import { useEquipment } from "@/features/equipment/equipment-provider"
import { useBookingFilters } from "@/features/equipment/use-booking-filters"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"
import type { Booking } from "@moc/types/equipment"
import { useListDetailSelection } from "@/hooks/use-list-detail-selection"

const bookingViews = ["list", "kanban", "calendar"] as const

export function useBookingsScreen() {
  const {
    state: { bookings, isLoadingBookings },
    actions: { loadBookings, loadEquipment },
  } = useEquipment()
  const [view, setView] = useViewQuery(bookingViews, "list")
  const isMobile = useIsMobile()
  const filters = useBookingFilters(bookings)
  const detail = useListDetailSelection<Booking>()
  const { close: closeDetail, select: selectBooking } = detail.actions
  const activeView = isMobile && view === "kanban" ? "list" : view

  useEffect(() => {
    void loadBookings()
    void loadEquipment()
  }, [loadBookings, loadEquipment])

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
      isLoading: isLoadingBookings,
      isMobile,
      activeView,
    },
  }
}
