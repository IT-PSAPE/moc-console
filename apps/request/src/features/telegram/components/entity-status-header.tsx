import { Hash } from "lucide-react"
import { Badge } from "@moc/ui/components/display/badge"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Title } from "@moc/ui/components/display/text"
import type { MiniAppStatus } from "@moc/notifications"

type EntityStatusHeaderProps = {
  title: string
  status: MiniAppStatus
  trackingCode: string | null
}

export function EntityStatusHeader({ title, status, trackingCode }: EntityStatusHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <Title.h1 className="title-h4">{title}</Title.h1>
      <Badge label={status.label} color={status.color} />
      {trackingCode && (
        <MetaRow icon={<Hash />} label="Tracking code">
          <span className="font-mono">{trackingCode}</span>
        </MetaRow>
      )}
    </header>
  )
}
