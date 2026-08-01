import { useEffect } from "react"
import { useEquipment } from "@/features/equipment/equipment-provider"
import { useBookingFilters } from "@/features/equipment/use-booking-filters"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"

const bookingViews = ["list", "table", "calendar"] as const

export function useBookingsScreen() {
  const {
    state: { bookings, isLoadingBookings },
    actions: { loadBookings, loadEquipment },
  } = useEquipment()
  const [view, setView] = useViewQuery(bookingViews, "list")
  const isMobile = useIsMobile()
  const filters = useBookingFilters(bookings)

  useEffect(() => {
    void loadBookings()
    void loadEquipment()
  }, [loadBookings, loadEquipment])

  function changeView(value: string) {
    setView(value)
  }

  return {
    actions: { changeView },
    meta: {
      filters,
      isLoading: isLoadingBookings,
      isMobile,
      activeView: isMobile && view === "table" ? "list" : view,
    },
  }
}
