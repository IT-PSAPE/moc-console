import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { routes } from "@/screens/console-routes"
import { buildTrackingShareData } from "@/features/tracking-submission"

type ConfirmationState = {
  type: "request" | "booking" | "venue_booking"
  trackingCode: string
  title?: string
}

const typeLabels: Record<ConfirmationState["type"], string> = {
  request: "Request",
  booking: "Booking",
  venue_booking: "Venue Booking",
}

export function useConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const confirmation = location.state as ConfirmationState | null
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  function backToHome() {
    navigate(routes.publicHome)
  }

  async function copy() {
    if (!confirmation?.trackingCode) return
    setShareError(null)
    try {
      await navigator.clipboard.writeText(confirmation.trackingCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError("Your browser could not copy the tracking code. Select it and copy it manually.")
    }
  }

  async function share() {
    if (!confirmation?.trackingCode) return
    const shareData = buildTrackingShareData(confirmation.trackingCode, window.location.origin)
    setShared(false)
    setShareError(null)
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.text)
      }
      setShared(true)
      window.setTimeout(() => setShared(false), 2000)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(shareData.text)
        setShared(true)
        window.setTimeout(() => setShared(false), 2000)
      } catch {
        setShareError("Your browser could not share these details. Copy the tracking code manually instead.")
      }
    }
  }

  return {
    state: { confirmation, copied, shared, shareError },
    actions: { backToHome, copy, share },
    meta: { typeLabel: confirmation ? typeLabels[confirmation.type] : "" },
  }
}
