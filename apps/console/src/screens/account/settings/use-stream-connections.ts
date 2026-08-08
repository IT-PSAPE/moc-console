import { useEffect } from "react"
import { syncZoomMeetings } from "@/data/mutate-zoom"
import { useStreams } from "@/features/streams/streams-provider"
import { useYouTubeOAuth } from "@/features/streams/use-youtube-oauth"
import { useZoomOAuth } from "@/features/streams/use-zoom-oauth"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"

export function useStreamConnections() {
  const { toast } = useFeedback()
  const { actions: { loadYouTubeConnection, loadZoomConnection, setZoomMeetings } } = useStreams()
  const { handleOAuthCallback: handleYouTubeCallback } = useYouTubeOAuth()
  const { handleOAuthCallback: handleZoomCallback } = useZoomOAuth()

  useEffect(() => {
    async function load() {
      const [youtube, zoom] = await Promise.all([handleYouTubeCallback(), handleZoomCallback()])
      if (youtube.connected) toast({ title: "YouTube connected", variant: "success" })
      else if (youtube.error) toast({ title: "Failed to connect YouTube", description: youtube.error, variant: "error" })
      if (zoom.connected) {
        toast({ title: "Zoom connected", variant: "success" })
        try {
          const meetings = await syncZoomMeetings()
          setZoomMeetings(meetings)
        } catch (error) {
          toast({ title: "Zoom connected, but meetings could not be synced", description: getErrorMessage(error, "Refresh the Streams screen to try again."), variant: "error" })
        }
      }
      else if (zoom.error) toast({ title: "Failed to connect Zoom", description: zoom.error, variant: "error" })
      await Promise.all([loadYouTubeConnection(), loadZoomConnection()])
    }
    void load()
  }, [handleYouTubeCallback, handleZoomCallback, loadYouTubeConnection, loadZoomConnection, setZoomMeetings, toast])
}
