import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { Divider } from "@moc/ui/components/display/divider"
import { Section } from "@moc/ui/components/display/section"
import { useStreamConnections } from "./use-stream-connections"

export function StreamsTabContent() {
  useStreamConnections()

  return (
    <Section>
      <Section.Header title="Streaming connections" />
      <Divider className="my-6" />
      <Section.Body>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </div>
      </Section.Body>
    </Section>
  )
}
