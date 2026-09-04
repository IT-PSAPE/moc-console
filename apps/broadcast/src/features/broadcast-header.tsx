import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { RadioTower } from "lucide-react"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

export function BroadcastHeader() {
  const { meta } = useBroadcastPlaybackContext()
  const { broadcast } = meta

  return (
    <header className="flex items-start gap-3 border-b border-secondary px-4 py-4 sm:px-6">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-tertiary">
        <RadioTower className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <Label.xs className="text-quaternary">Live broadcast</Label.xs>
        <Title.h6 className="truncate">{broadcast.title}</Title.h6>
        {broadcast.description ? <Paragraph.sm className="mt-1 line-clamp-2 text-tertiary">{broadcast.description}</Paragraph.sm> : null}
      </div>
    </header>
  )
}
