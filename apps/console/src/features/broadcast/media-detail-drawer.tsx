import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { mediaTypeColor, mediaTypeLabel } from "@moc/types/broadcast/constants"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time"
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileType,
  Maximize2,
  Play,
  Trash2,
  X,
} from "lucide-react"

type MediaDetailDrawerProps = {
  item: MediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: (item: MediaItem) => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`
}

export function MediaDetailDrawer({ item, open, onOpenChange, onDelete }: MediaDetailDrawerProps) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const canDelete = role?.can_delete === true

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleOpenFullPage = useCallback(() => {
    if (!item) return
    onOpenChange(false)
    navigate(`/${routes.broadcastMediaDetail.replace(":id", item.id)}`)
  }, [item, navigate, onOpenChange])

  if (!item) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Panel className="max-w-lg">
          <Drawer.Header className="flex items-center gap-1">
            <Button.Icon variant="ghost" icon={<X />} onClick={() => onOpenChange(false)} />
            <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} />
            <div className="flex-1" />
            {canDelete && (
              <Button.Icon
                variant="ghost"
                icon={<Trash2 />}
                onClick={() => onDelete?.(item)}
              />
            )}
          </Drawer.Header>

          <Drawer.Content className="py-4">
            {/* Preview */}
            <div className="px-4 pb-4">
              <div className="w-full rounded-lg bg-secondary_alt border border-tertiary flex items-center justify-center overflow-hidden aspect-video">
                {item.type === "image" && <ImagePreview key={item.id} item={item} />}
                {item.type === "video" && <VideoPreview key={item.id} item={item} />}
                {item.type === "audio" && <AudioPreview key={item.id} item={item} />}
              </div>
            </div>

            {/* Title */}
            <div className="px-4 pb-4">
              <Title.h6>{item.name}</Title.h6>
            </div>

            <div className="px-4 space-y-3">
              <MetaRow icon={<FileType />} label="Type">
                <Badge label={mediaTypeLabel[item.type]} color={mediaTypeColor[item.type]} />
              </MetaRow>

              {item.duration != null && (
                <MetaRow icon={<Clock />} label="Duration">
                  <Paragraph.xs>{formatDuration(item.duration)}</Paragraph.xs>
                </MetaRow>
              )}

              <MetaRow icon={<Calendar />} label="Created">
                <Paragraph.xs>{formatUtcIsoInBrowserTimeZone(item.createdAt)}</Paragraph.xs>
              </MetaRow>
            </div>

            <Divider className="px-4 py-6" />

            <div className="px-4 space-y-3">
              <Label.md>Source URL</Label.md>
              <div className="flex items-center gap-2">
                <Paragraph.xs className="text-tertiary truncate flex-1">{item.url}</Paragraph.xs>
                <Button.Icon
                  variant="ghost"
                  icon={copied ? <Check className="text-utility-green-700" /> : <Copy />}
                  onClick={() => handleCopy(item.url)}
                />
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <Button.Icon variant="ghost" icon={<ExternalLink />} />
                </a>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer>
  )
}

// ─── Previews ───────────────────────────────────────────

function ImagePreview({ item }: { item: MediaItem }) {
  return (
    <img
      src={item.url}
      alt={item.name}
      className="size-full object-contain"
    />
  )
}

function VideoPreview({ item }: { item: MediaItem }) {
  return (
    <video
      src={item.url}
      poster={item.thumbnail ?? undefined}
      controls
      playsInline
      preload="metadata"
      className="size-full"
    />
  )
}

function AudioPreview({ item }: { item: MediaItem }) {
  return (
    <div className="size-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="size-20 rounded-full bg-primary border border-tertiary flex items-center justify-center">
        <Play className="size-8 text-tertiary" />
      </div>
      <audio src={item.url} controls preload="metadata" className="w-full max-w-xs" />
    </div>
  )
}
