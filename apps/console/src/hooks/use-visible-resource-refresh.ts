import { useEffect } from "react"

const REFRESH_INTERVAL_MS = 30_000

export function useVisibleResourceRefresh(load: (mode: "background") => Promise<void>, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    function refreshWhenVisible(): void {
      if (document.visibilityState === "visible") void load("background")
    }

    refreshWhenVisible()
    const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [enabled, load])
}
