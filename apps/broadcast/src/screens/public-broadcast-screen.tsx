import { fetchPublicBroadcast } from "@/data/fetch-public-broadcast"
import { AudioBroadcastPlayer } from "@/features/audio-broadcast-player"
import { VideoBroadcastPlayer } from "@/features/video-broadcast-player"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Page } from "@moc/ui/components/layout/page"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { RadioTower } from "lucide-react"

export function PublicBroadcastScreen() {
  const { slug } = useParams()
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setBroadcast(null)
      setIsLoading(false)
      return
    }

    const broadcastSlug = slug
    let cancelled = false

    async function loadBroadcast() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const nextBroadcast = await fetchPublicBroadcast(broadcastSlug)

        if (!cancelled) {
          setBroadcast(nextBroadcast)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "The broadcast could not be loaded.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBroadcast()

    return () => {
      cancelled = true
    }
  }, [slug])

  function renderContent() {
    if (isLoading) {
      return <LoadingSpinner className="py-10" />
    }

    if (loadError) {
      return <Alert variant="error" title="Could not load broadcast" description={loadError} />
    }

    if (!broadcast) {
      return (
        <EmptyState
          icon={<RadioTower />}
          title="Broadcast not found"
          description="This link does not point to a published broadcast."
        />
      )
    }

    return broadcast.kind === "audio" ? <AudioBroadcastPlayer broadcast={broadcast} /> : <VideoBroadcastPlayer broadcast={broadcast} />
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Broadcast</Page.Title>
        </Page.Heading>
      </Page.Header>
      <Page.Content className="flex flex-col gap-4">{renderContent()}</Page.Content>
    </Page>
  )
}
