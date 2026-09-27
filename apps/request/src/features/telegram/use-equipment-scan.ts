import { useCallback, useEffect, useRef, useState } from "react"
import { findBookingItemFromScan } from "@moc/utils/equipment-scan"
import { postTelegramMiniApp } from "@/data/telegram-mini-app"
import type { TelegramWebApp } from "@/lib/telegram-web-app"
import type { MiniAppEquipmentItem, MiniAppResponse, MiniAppScanMode } from "@moc/notifications"

type UseEquipmentScanOptions = {
  bookingId: string
  items: MiniAppEquipmentItem[]
  scanMode: MiniAppScanMode | null
  initData: string
  webApp: TelegramWebApp | null
  onSubmitted: (response: MiniAppResponse) => void
}

type ScanSession = { key: string; scannedItemIds: ReadonlySet<string> }

// Drives Telegram's native showScanQrPopup as a continuous scan session: the
// popup stays open between scans (the callback always returns false), each
// match is ticked off with haptic feedback, and once every item is scanned
// the popup is closed and the scan is submitted automatically. "Done" submits
// early with whatever has been scanned. Starting the scan automatically for a
// "sc_<bookingId>" launch target is the caller's concern (see
// equipment-scan-section.tsx) — this hook only exposes `start`.
export function useEquipmentScan({ bookingId, items, scanMode, initData, webApp, onSubmitted }: UseEquipmentScanOptions) {
  // Scan progress is session-local and keyed by booking and scan mode, so a
  // different booking — or the return scan after a check-out — starts fresh.
  // Adjusting state during render (rather than in an effect) avoids an extra
  // render and matches the console's own booking-scan progress pattern.
  const sessionKey = `${bookingId}:${scanMode ?? "none"}`
  const [session, setSession] = useState<ScanSession>(() => ({ key: sessionKey, scannedItemIds: new Set() }))
  let scannedItemIds = session.scannedItemIds
  if (session.key !== sessionKey) {
    scannedItemIds = new Set()
    setSession({ key: sessionKey, scannedItemIds })
  }

  const [isScanning, setIsScanning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const scannedItemIdsRef = useRef(scannedItemIds)
  const itemsRef = useRef(items)

  useEffect(() => {
    scannedItemIdsRef.current = scannedItemIds
  }, [scannedItemIds])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const submit = useCallback(async () => {
    if (!scanMode || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const response = await postTelegramMiniApp({
      op: "booking.scan_complete",
      initData,
      bookingId,
      mode: scanMode,
      scannedItemIds: Array.from(scannedItemIdsRef.current),
    })
    setIsSubmitting(false)
    onSubmitted(response)
  }, [bookingId, initData, isSubmitting, onSubmitted, scanMode])

  const finish = useCallback(() => {
    webApp?.closeScanQrPopup()
    setIsScanning(false)
    void submit()
  }, [submit, webApp])

  const handleScanned = useCallback((rawValue: string): boolean => {
    const match = findBookingItemFromScan(itemsRef.current, rawValue)

    if (!match) {
      webApp?.HapticFeedback.notificationOccurred("error")
      return false
    }

    if (scannedItemIdsRef.current.has(match.id)) {
      webApp?.HapticFeedback.notificationOccurred("warning")
      return false
    }

    webApp?.HapticFeedback.notificationOccurred("success")
    const next = new Set(scannedItemIdsRef.current)
    next.add(match.id)
    scannedItemIdsRef.current = next
    setSession({ key: sessionKey, scannedItemIds: next })

    if (next.size >= itemsRef.current.length && itemsRef.current.length > 0) {
      finish()
    }

    return false
  }, [finish, sessionKey, webApp])

  const start = useCallback(() => {
    if (!webApp || !scanMode) {
      return
    }

    setIsScanning(true)
    webApp.showScanQrPopup({ text: "Scan an item" }, handleScanned)
  }, [handleScanned, scanMode, webApp])

  const scannedCount = scannedItemIds.size
  const totalCount = items.length
  const isComplete = totalCount > 0 && scannedCount >= totalCount

  return {
    state: { isScanning, scannedItemIds, scannedCount, totalCount, isComplete, isSubmitting },
    actions: { start, finish },
    meta: {},
  }
}
