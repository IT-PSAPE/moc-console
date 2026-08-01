import { useEffect } from "react"
import { Section } from "@moc/ui/components/display/section"
import { StreamsProvider, useStreams } from "@/features/streams/streams-provider"
import { YouTubeConnectionCard } from "@/features/streams/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/streams/zoom-connection-card"
import { useYouTubeOAuth } from "@/features/streams/use-youtube-oauth"
import { useZoomOAuth } from "@/features/streams/use-zoom-oauth"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { Divider } from "@moc/ui/components/display/divider";

export function StreamsTab() {
    return (
        <StreamsProvider>
            <StreamsTabContent />
        </StreamsProvider>
    )
}

function StreamsTabContent() {
    const { toast } = useFeedback()
    const { actions: { loadYouTubeConnection, loadZoomConnection } } = useStreams()
    const { handleOAuthCallback: handleYouTubeCallback } = useYouTubeOAuth()
    const { handleOAuthCallback: handleZoomCallback } = useZoomOAuth()

    useEffect(() => {
        async function init() {
            const [ytResult, zoomResult] = await Promise.all([
                handleYouTubeCallback(),
                handleZoomCallback(),
            ])

            if (ytResult.connected) {
                toast({ title: "YouTube connected successfully", variant: "success" })
            } else if (ytResult.error) {
                toast({ title: "Failed to connect YouTube", description: ytResult.error, variant: "error" })
            }

            if (zoomResult.connected) {
                toast({ title: "Zoom connected successfully", variant: "success" })
            } else if (zoomResult.error) {
                toast({ title: "Failed to connect Zoom", description: zoomResult.error, variant: "error" })
            }

            await Promise.all([loadYouTubeConnection(), loadZoomConnection()])
        }
        void init()
    }, [handleYouTubeCallback, handleZoomCallback, loadYouTubeConnection, loadZoomConnection, toast])

    return (
        <Section>
            <Section.Header title="Streaming connections" />

            <Divider className="my-6" />

            <Section.Body>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <YouTubeConnectionCard />
                    <ZoomConnectionCard />
                </div>
            </Section.Body>
        </Section>
    )
}
