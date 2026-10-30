import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { Section } from "@moc/ui/components/display/section"
import { useStreamConnections } from "./use-stream-connections"
import { useStreams } from "@/features/streams/streams-provider"
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification"

export function IntegrationsSection() {
  useStreamConnections()
  const { state, actions } = useStreams()

  return (
    <Section>
      <Section.Header title="Integrations" description="Manage YouTube and Zoom connections." />
      <Section.Body>
        {state.youtubeConnectionError ? <RetryNotification title="YouTube connection couldn't be loaded" description={state.youtubeConnectionError.message} onRetry={actions.retryYouTubeConnection} /> : null}
        {state.zoomConnectionError ? <RetryNotification title="Zoom connection couldn't be loaded" description={state.zoomConnectionError.message} onRetry={actions.retryZoomConnection} /> : null}
        <DividedList>
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </DividedList>
      </Section.Body>
    </Section>
  )
}
