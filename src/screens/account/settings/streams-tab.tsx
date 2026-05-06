import { useEffect } from "react"
import { Section } from "@/components/display/section"
import { BroadcastProvider, useBroadcast } from "@/features/broadcast/broadcast-provider"
import { YouTubeConnectionCard } from "@/features/broadcast/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/broadcast/zoom-connection-card"
import { useYouTubeOAuth } from "@/features/broadcast/use-youtube-oauth"
import { useZoomOAuth } from "@/features/broadcast/use-zoom-oauth"
import { useFeedback } from "@/components/feedback/feedback-provider"

export function StreamsTab() {
    return (
        <BroadcastProvider>
            <StreamsTabContent />
        </BroadcastProvider>
    )
}

function StreamsTabContent() {
    const { toast } = useFeedback()
    const { actions: { loadYouTubeConnection, loadZoomConnection } } = useBroadcast()
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
            <Section.Header
                title="Streaming connections"
                description="Connect YouTube and Zoom so this workspace can publish streams and meetings."
            />
            <Section.Body>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <YouTubeConnectionCard />
                    <ZoomConnectionCard />
                </div>
            </Section.Body>
        </Section>
    )
}
