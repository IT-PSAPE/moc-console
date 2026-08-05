import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { routes } from "@/screens/console-routes"

type ConfirmationState = {
  type: "request" | "booking"
  trackingCode: string
  title?: string
}

export function useConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const confirmation = location.state as ConfirmationState | null
  const [copied, setCopied] = useState(false)

  function backToHome() {
    navigate(routes.publicHome)
  }

  async function copy() {
    if (!confirmation?.trackingCode) return
    await navigator.clipboard.writeText(confirmation.trackingCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return {
    state: { confirmation, copied },
    actions: { backToHome, copy },
    meta: { typeLabel: confirmation?.type === "request" ? "Request" : "Booking" },
  }
}
