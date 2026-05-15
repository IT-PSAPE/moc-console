import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "./broadcast-provider"
import { useZoomOAuth } from "./use-zoom-oauth"
import { disconnectZoom } from "@moc/data/mutate-zoom"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { IntegrationCard } from "./integration-card"
import { useCallback, useState } from "react"

export function ZoomConnectionCard() {
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, isLoadingZoomConnection },
    actions: { setZoomConnection },
  } = useBroadcast()
  const { startOAuthFlow } = useZoomOAuth()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true)
    try {
      await disconnectZoom()
      setZoomConnection(null)
      toast({ title: "Zoom disconnected", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to disconnect Zoom", description: getErrorMessage(error, "The Zoom connection could not be removed."), variant: "error" })
    } finally {
      setIsDisconnecting(false)
    }
  }, [setZoomConnection, toast])

  return (
    <IntegrationCard
      icon={<img src="/resources/logo/Zoom.svg" alt="Zoom" />}
      name="Zoom"
      description="Meetings"
      isLoading={isLoadingZoomConnection}
      isConnected={Boolean(zoomConnection)}
      accountLabel={zoomConnection?.displayName ?? null}
      canManage={role?.can_manage_roles === true}
      onConnect={startOAuthFlow}
      onDisconnect={handleDisconnect}
      isDisconnecting={isDisconnecting}
    />
  )
}
