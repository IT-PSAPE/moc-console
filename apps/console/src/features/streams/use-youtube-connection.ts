import { useCallback, useState } from "react"
import { disconnectYouTube } from "@/data/mutate-streams"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useStreams } from "./streams-provider"
import { useYouTubeOAuth } from "./use-youtube-oauth"

export function useYouTubeConnection() {
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const {
    state: { youtubeConnection, isLoadingConnection },
    actions: { setYouTubeConnection },
  } = useStreams()
  const { startOAuthFlow } = useYouTubeOAuth()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true)
    try {
      await disconnectYouTube()
      setYouTubeConnection(null)
      toast({ title: "YouTube disconnected", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to disconnect YouTube", description: getErrorMessage(error, "The YouTube connection could not be removed."), variant: "error" })
    } finally {
      setIsDisconnecting(false)
    }
  }, [setYouTubeConnection, toast])

  return {
    state: { isDisconnecting },
    actions: { connect: startOAuthFlow, disconnect },
    meta: { connection: youtubeConnection, isLoading: isLoadingConnection, canManage: role?.can_manage_roles === true },
  }
}
