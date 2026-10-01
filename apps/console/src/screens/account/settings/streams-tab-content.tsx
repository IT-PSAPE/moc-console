import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { Section } from "@moc/ui/components/display/section"
import { useStreamConnections } from "./use-stream-connections"

export function StreamsTabContent() {
  useStreamConnections()

  return (
    <Section>
      <Section.Header title="Streaming connections" description="Connect the services used to schedule and manage broadcasts." />
      <Section.Body>
        <DividedList>
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </DividedList>
      </Section.Body>
    </Section>
  )
}
