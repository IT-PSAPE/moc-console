import { AudioBroadcastPlayer } from "@/features/audio-broadcast-player"
import { usePublicBroadcast } from "@/features/use-public-broadcast"
import { VideoBroadcastPlayer } from "@/features/video-broadcast-player"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Decision } from "@moc/ui/components/display/decision"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { RadioTower } from "lucide-react"
import { useParams } from "react-router-dom"
import { BroadcastLayout } from "@/features/broadcast-layout"

function renderPlayer(broadcast: Broadcast) {
  if (broadcast.items.length === 0) {
    return (
      <BroadcastLayout>
        <EmptyState
          icon={<RadioTower />}
          title="Nothing is queued yet"
          description="This player starts as soon as the broadcast owner adds media."
        />
      </BroadcastLayout>
    )
  }

  return broadcast.kind === "audio"
    ? <AudioBroadcastPlayer key={broadcast.id} broadcast={broadcast} />
    : <VideoBroadcastPlayer key={broadcast.id} broadcast={broadcast} />
}

export function PublicBroadcastScreen() {
  const { slug } = useParams()
  const { broadcast, error, isLoading } = usePublicBroadcast(slug)

  if (error) {
    return (
      <BroadcastLayout>
        <Alert variant="error" title="Could not load broadcast" description={error} />
      </BroadcastLayout>
    )
  }

  return (
    <Decision value={broadcast} loading={isLoading}>
      <Decision.Loading>
        <BroadcastLayout><LoadingSpinner /></BroadcastLayout>
      </Decision.Loading>
      <Decision.Empty>
        <BroadcastLayout>
          <EmptyState
            icon={<RadioTower />}
            title="Broadcast not found"
            description="This link does not point to an available broadcast."
          />
        </BroadcastLayout>
      </Decision.Empty>
      <Decision.Data>{renderPlayer}</Decision.Data>
    </Decision>
  )
}
