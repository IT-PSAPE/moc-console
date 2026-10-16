import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { Section } from "@moc/ui/components/display/section"
import { useStreamConnections } from "./use-stream-connections"
import { useStreams } from "@/features/streams/streams-provider"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"

export function IntegrationsSection() {
  useStreamConnections()
  const { state, actions } = useStreams()

  return (
    <Section>
      <Section.Header title="Integrations" description="Manage YouTube and Zoom connections." />
      <Section.Body>
        {state.youtubeConnectionError ? <ResourceLoadError title="YouTube connection couldn't be loaded" error={state.youtubeConnectionError} onRetry={actions.retryYouTubeConnection} /> : null}
        {state.zoomConnectionError ? <ResourceLoadError title="Zoom connection couldn't be loaded" error={state.zoomConnectionError} onRetry={actions.retryZoomConnection} /> : null}
        <DividedList>
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </DividedList>
      </Section.Body>
    </Section>
  )
}
