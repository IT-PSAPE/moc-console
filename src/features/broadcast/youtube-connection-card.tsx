import { Card } from "@/components/display/card"
import { Button } from "@/components/controls/button"
import { Label, Paragraph } from "@/components/display/text"
import { Badge } from "@/components/display/badge"
import { Spinner } from "@/components/feedback/spinner"
import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "./broadcast-provider"
import { useYouTubeOAuth } from "./use-youtube-oauth"
import { disconnectYouTube } from "@/data/mutate-streams"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { getErrorMessage } from "@/utils/get-error-message"
import { Link2, Unlink, Video } from "lucide-react"
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

  const canManage = role?.can_manage_roles === true

  const handleConnect = useCallback(() => {
    startOAuthFlow()
  }, [startOAuthFlow])

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

  if (isLoadingConnection) {
    return (
      <Card.Root>
        <Card.Content>
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  if (youtubeConnection) {
    return (
      <Card.Root>
        <Card.Content>
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0 rounded-md bg-utility-red-50 flex items-center justify-center">
                <Video className="size-5 text-utility-red-700" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label.sm>{youtubeConnection.channelTitle}</Label.sm>
                <div className="flex items-center gap-1.5">
                  <Badge label="Connected" color="green" />
                </div>
              </div>
            </div>
            {canManage && (
              <Button
                variant="danger-secondary"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <Unlink className="size-4" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Content>
        <div className="flex flex-col items-center gap-3 py-8 px-4">
          <div className="size-12 rounded-full bg-utility-red-50 flex items-center justify-center">
            <Video className="size-6 text-utility-red-700" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Label.sm>Connect YouTube</Label.sm>
            <Paragraph.sm className="text-tertiary max-w-md">
              Connect your YouTube account to create and manage live streams directly from your workspace.
            </Paragraph.sm>
          </div>
          {canManage ? (
            <Button variant="primary" onClick={handleConnect} icon={<Link2 className="size-4" />}>
              Connect YouTube Account
            </Button>
          ) : (
            <Paragraph.xs className="text-quaternary">
              Ask a workspace admin to connect YouTube.
            </Paragraph.xs>
          )}
        </div>
      </Card.Content>
    </Card.Root>
  )
}
