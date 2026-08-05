import { useEffect, useMemo, useState } from "react"
import { useRequests } from "@/features/requests/request-provider"
import { useEquipment } from "@/features/equipment/equipment-provider"

export function useDashboard() {
  const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()
  const { state: { bookings, isLoadingBookings }, actions: { loadBookings } } = useEquipment()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    void loadActiveRequests()
  }, [loadActiveRequests])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const overdueRequests = useMemo(() => {
    if (now === null) return []
    return activeRequests
      .filter((request) => request.status !== "archived" && request.status !== "completed" && new Date(request.dueDate).getTime() < now)
      .sort((first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())
      .slice(0, 4)
  }, [activeRequests, now])

  const upcomingRequests = useMemo(() => {
    if (now === null) return []
    return activeRequests
      .filter((request) => request.status !== "archived" && request.status !== "completed" && new Date(request.dueDate).getTime() >= now)
      .sort((first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())
      .slice(0, 4)
  }, [activeRequests, now])

  const upcomingBookings = useMemo(() => {
    if (now === null) return []
    return bookings
      .filter((booking) => booking.status === "booked" && new Date(booking.checkedOutDate).getTime() >= now)
      .sort((first, second) => new Date(first.checkedOutDate).getTime() - new Date(second.checkedOutDate).getTime())
      .slice(0, 4)
  }, [bookings, now])

  return { state: { overdueRequests, upcomingRequests, upcomingBookings }, meta: { isLoadingRequests: isLoadingActive, isLoadingBookings } }
}
