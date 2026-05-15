import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "./broadcast-provider"
import { useYouTubeOAuth } from "./use-youtube-oauth"
import { disconnectYouTube } from "@/data/mutate-streams"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { IntegrationCard } from "./integration-card"
import { useCallback, useState } from "react"

export function YouTubeConnectionCard() {
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { youtubeConnection, isLoadingConnection },
    actions: { setYouTubeConnection },
  } = useBroadcast()
  const { startOAuthFlow } = useYouTubeOAuth()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = useCallback(async () => {
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

  return (
    <IntegrationCard
      icon={<img src="/resources/logo/Youtube.svg" alt="YouTube" />}
      name="YouTube"
      description="Live streams"
      isLoading={isLoadingConnection}
      isConnected={Boolean(youtubeConnection)}
      accountLabel={youtubeConnection?.channelTitle ?? null}
      canManage={role?.can_manage_roles === true}
      onConnect={startOAuthFlow}
      onDisconnect={handleDisconnect}
      isDisconnecting={isDisconnecting}
    />
  )
}
