import { useEffect, useMemo, useState } from "react"
import { useRequests } from "@/features/requests/request-provider"

export function useDashboard() {
  const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    void loadActiveRequests()
  }, [loadActiveRequests])

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

  return { state: { overdueRequests, upcomingRequests }, meta: { isLoading: isLoadingActive } }
}
