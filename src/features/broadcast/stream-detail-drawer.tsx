import { useCallback, useState } from "react"
import { Drawer } from "@/components/overlays/drawer"
import { Button } from "@/components/controls/button"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
import { MetaRow } from "@/components/display/meta-row"
import { useAuth } from "@/lib/auth-context"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel } from "@/types/broadcast/stream-constants"
import type { Stream } from "@/types/broadcast/stream"
import { latencyPreferenceLabel } from "@/types/broadcast/stream-constants"
import { formatUtcIsoInTimezone } from "@/utils/zoned-date-time"
import {
  Calendar,
  Check,
  Code,
  Copy,
  ExternalLink,
  Eye,
  Gauge,
  Key,
  ListVideo,
  Loader,
  Monitor,
  Pencil,
  Play,
  Shield,
  Square,
  Tag,
  Trash2,
  X,
} from "lucide-react"

type StreamDetailDrawerProps = {
  stream: Stream | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (stream: Stream) => void
  onDelete?: (stream: Stream) => void
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamDetailDrawer({ stream, open, onOpenChange, onEdit, onDelete }: StreamDetailDrawerProps) {
  const { role } = useAuth()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const canEdit = role?.can_update === true && stream?.streamStatus === "created"
  const canDelete = role?.can_delete === true && stream?.streamStatus === "created"
  const canViewStreamKey = role?.can_create === true

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  if (!stream) return null

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Panel className="!max-w-lg">
          <Drawer.Header className="flex items-center gap-1">
            <Button.Icon variant="ghost" icon={<X />} onClick={() => onOpenChange(false)} />
            <div className="flex-1" />
            {canEdit && (
              <Button.Icon
                variant="ghost"
                icon={<Pencil />}
                onClick={() => onEdit?.(stream)}
              />
            )}
            {canDelete && (
              <Button.Icon
                variant="ghost"
                icon={<Trash2 />}
                onClick={() => onDelete?.(stream)}
              />
            )}
          </Drawer.Header>

          <Drawer.Content className="py-4">
            {stream.thumbnailUrl && (
              <div className="px-4 pb-4">
                <img
                  src={stream.thumbnailUrl}
                  alt={stream.title}
                  className="w-full rounded-lg object-cover aspect-video"
                />
              </div>
            )}

            <div className="px-4 pb-4">
              <Title.h6>{stream.title}</Title.h6>
              {stream.description && (
                <Paragraph.sm className="text-tertiary mt-1">{stream.description}</Paragraph.sm>
              )}
            </div>

            <div className="px-4 space-y-3">
              <MetaRow icon={<Loader />} label="Status">
                <Badge
                  label={streamStatusLabel[stream.streamStatus]}
                  color={streamStatusColor[stream.streamStatus]}
                />
              </MetaRow>

              <MetaRow icon={<Shield />} label="Privacy">
                <Paragraph.xs>{streamPrivacyLabel[stream.privacyStatus]}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Calendar />} label="Scheduled">
                <Paragraph.xs>{formatDateTime(stream.scheduledStartTime)}</Paragraph.xs>
              </MetaRow>

              {stream.actualStartTime && (
                <MetaRow icon={<Calendar />} label="Started">
                  <Paragraph.xs>{formatDateTime(stream.actualStartTime)}</Paragraph.xs>
                </MetaRow>
              )}

              {stream.actualEndTime && (
                <MetaRow icon={<Calendar />} label="Ended">
                  <Paragraph.xs>{formatDateTime(stream.actualEndTime)}</Paragraph.xs>
                </MetaRow>
              )}

              {stream.isForKids && (
                <MetaRow icon={<Eye />} label="Audience">
                  <Paragraph.xs>Made for kids</Paragraph.xs>
                </MetaRow>
              )}

              <MetaRow icon={<Gauge />} label="Latency">
                <Paragraph.xs>{latencyPreferenceLabel[stream.latencyPreference]}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Monitor />} label="DVR">
                <Paragraph.xs>{stream.enableDvr ? "Enabled" : "Disabled"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Code />} label="Embedding">
                <Paragraph.xs>{stream.enableEmbed ? "Allowed" : "Disabled"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Play />} label="Auto-start">
                <Paragraph.xs>{stream.enableAutoStart ? "On" : "Off"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Square />} label="Auto-stop">
                <Paragraph.xs>{stream.enableAutoStop ? "On" : "Off"}</Paragraph.xs>
              </MetaRow>

              {stream.tags.length > 0 && (
                <MetaRow icon={<Tag />} label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {stream.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </MetaRow>
              )}

              {stream.playlistId && (
                <MetaRow icon={<ListVideo />} label="Playlist">
                  <Paragraph.xs className="truncate">{stream.playlistId}</Paragraph.xs>
                </MetaRow>
              )}
            </div>

            {stream.streamUrl && (
              <>
                <Divider className="px-4 py-6" />
                <div className="px-4 space-y-3">
                  <Label.md>YouTube Link</Label.md>
                  <div className="flex items-center gap-2">
                    <Paragraph.xs className="text-tertiary truncate flex-1">
                      {stream.streamUrl}
                    </Paragraph.xs>
                    <Button.Icon
                      variant="ghost"
                      icon={copiedField === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={() => handleCopy(stream.streamUrl!, "url")}
                    />
                    <a href={stream.streamUrl} target="_blank" rel="noopener noreferrer">
                      <Button.Icon variant="ghost" icon={<ExternalLink />} />
                    </a>
                  </div>
                </div>
              </>
            )}

            {canViewStreamKey && stream.streamKey && (
              <>
                <Divider className="px-4 py-6" />
                <div className="px-4 space-y-3">
                  <Label.md>Stream Setup (OBS / Encoder)</Label.md>

                  <MetaRow icon={<Key />} label="Stream Key">
                    <div className="flex items-center gap-1">
                      <Paragraph.xs className="font-mono truncate">{stream.streamKey}</Paragraph.xs>
                      <Button.Icon
                        variant="ghost"
                        icon={copiedField === "key" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={() => handleCopy(stream.streamKey!, "key")}
                      />
                    </div>
                  </MetaRow>

                  {stream.ingestionUrl && (
                    <MetaRow icon={<ExternalLink />} label="Server URL">
                      <div className="flex items-center gap-1">
                        <Paragraph.xs className="font-mono truncate">{stream.ingestionUrl}</Paragraph.xs>
                        <Button.Icon
                          variant="ghost"
                          icon={copiedField === "ingestion" ? <Check className="text-utility-green-700" /> : <Copy />}
                          onClick={() => handleCopy(stream.ingestionUrl!, "ingestion")}
                        />
                      </div>
                    </MetaRow>
                  )}
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
