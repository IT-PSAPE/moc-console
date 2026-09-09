import { useCallback, useState } from "react"
import { disconnectZoom } from "@/data/mutate-zoom"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useStreams } from "./streams-provider"
import { useZoomOAuth } from "./use-zoom-oauth"

export function useZoomConnection() {
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, isLoadingZoomConnection },
    actions: { setZoomConnection, setZoomMeetings },
  } = useStreams()
  const { startOAuthFlow } = useZoomOAuth()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true)
    try {
      await disconnectZoom()
      setZoomConnection(null)
      setZoomMeetings([])
      toast({ title: "Zoom disconnected", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to disconnect Zoom", description: getErrorMessage(error, "The Zoom connection could not be removed."), variant: "error" })
    } finally {
      setIsDisconnecting(false)
    }
  }, [setZoomConnection, setZoomMeetings, toast])

  return {
    state: { isDisconnecting },
    actions: { connect: startOAuthFlow, disconnect },
    meta: { connection: zoomConnection, isLoading: isLoadingZoomConnection, canManage: role?.can_manage_roles === true },
  }
}
