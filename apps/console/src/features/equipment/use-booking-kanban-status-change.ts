import { useCallback } from "react"
import { updateBookingStatus } from "@/data/mutate-booking"
import { useKanbanStatusChange } from "@/hooks/use-kanban-status-change"
import type { Booking, BookingStatus } from "@moc/types/equipment"
import { bookingStatusLabel } from "@moc/types/equipment"
import { useEquipment } from "./equipment-provider"

function getBookingStatus(booking: Booking) {
  return booking.status
}

function setBookingStatus(booking: Booking, status: BookingStatus): Booking {
  const now = new Date().toISOString()

  return {
    ...booking,
    status,
    checkedOutDate: status === "checked_out" && booking.status !== "checked_out" ? now : booking.checkedOutDate,
    returnedDate: status === "returned" && !booking.returnedDate ? now : booking.returnedDate,
  }
}

function getBookingStatusLabel(status: BookingStatus) {
  return bookingStatusLabel[status]
}

export function useBookingKanbanStatusChange() {
  const { actions: { refreshEquipment, syncBooking } } = useEquipment()

  const persist = useCallback(async (id: string, status: BookingStatus) => {
    await updateBookingStatus(id, status)
    await refreshEquipment()
  }, [refreshEquipment])

  return useKanbanStatusChange<Booking, BookingStatus>({
    dataKey: "booking",
    getStatus: getBookingStatus,
    setStatus: setBookingStatus,
    sync: syncBooking,
    persist,
    statusLabel: getBookingStatusLabel,
    errorMessage: "The booking status could not be updated.",
  })
}
