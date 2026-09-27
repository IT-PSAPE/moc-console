import { useEffect, useRef } from "react"

type UseAutoStartScanOptions = {
  autoStart: boolean
  canStart: boolean
  start: () => void
}

// Triggers `start` once when a "sc_<bookingId>" launch target opens straight
// into scanning. Lives in its own hook (rather than useEquipmentScan) so the
// scan hook stays a pure state/actions hook and this one-shot trigger is the
// only thing calling `start` from an effect.
export function useAutoStartScan({ autoStart, canStart, start }: UseAutoStartScanOptions) {
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!autoStart || !canStart || hasStartedRef.current) {
      return
    }
    hasStartedRef.current = true
    start()
  }, [autoStart, canStart, start])
}
