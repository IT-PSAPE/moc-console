import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { Section } from "@moc/ui/components/display/section"
import { useStreamConnections } from "./use-stream-connections"

export function StreamsTabContent() {
  useStreamConnections()

  return (
    <Section>
      <Section.Header title="Streaming connections" description="Connect the services used to schedule and manage broadcasts." />
      <Section.Body>
        <div className="grid grid-cols-1 gap-3">
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </div>
      </Section.Body>
    </Section>
  )
}
