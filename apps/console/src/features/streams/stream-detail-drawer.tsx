import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel } from "@moc/types/streams/stream-constants"
import type { Stream } from "@moc/types/streams/stream"
import { latencyPreferenceLabel } from "@moc/types/streams/stream-constants"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
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
  Maximize2,
  Monitor,
  Pencil,
  Play,
  Shield,
  Square,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { useStreamDetailDrawer } from "./use-stream-detail-drawer"

type StreamDetailPanelProps = {
  stream: Stream
  onClose: () => void
  onEdit?: (stream: Stream) => void
  onDelete?: (stream: Stream) => void
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamDetailPanel({ stream, onClose, onEdit, onDelete }: StreamDetailPanelProps) {
  const drawer = useStreamDetailDrawer(stream, onClose, onEdit, onDelete)

  return (
    <>
          <Paragraph.xs role="status" aria-live="polite" className="sr-only">{drawer.state.copyMessage}</Paragraph.xs>
          <SplitPanel.Header className="flex items-center gap-1">
            <Button.Icon aria-label="Close stream" variant="ghost" icon={<X />} onClick={drawer.actions.close} />
            <Button.Icon aria-label="Open full page" variant="ghost" icon={<Maximize2 />} onClick={drawer.actions.openFullPage} />
            <div className="flex-1" />
            {drawer.meta.canEdit && (
              <Button.Icon
                aria-label="Edit stream"
                variant="ghost"
                icon={<Pencil />}
                onClick={drawer.actions.edit}
              />
            )}
            {drawer.meta.canDelete && (
              <Button.Icon
                aria-label="Delete stream"
                variant="ghost"
                icon={<Trash2 />}
                onClick={drawer.actions.remove}
              />
            )}
          </SplitPanel.Header>

          <SplitPanel.Content className="py-4">
            {stream.thumbnailUrl && (
              <div className="px-4 pb-4">
                <img
                  src={stream.thumbnailUrl}
                  alt={stream.title}
                  width="640"
                  height="360"
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
                <Divider className="my-6" />
                <div className="px-4 space-y-3">
                  <Label.md>YouTube link</Label.md>
                  <div className="flex items-center gap-2">
                    <Paragraph.xs className="text-tertiary truncate flex-1">
                      {stream.streamUrl}
                    </Paragraph.xs>
                    <Button.Icon
                      aria-label="Copy stream link"
                      variant="ghost"
                      icon={drawer.state.copiedField === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={drawer.actions.copyUrl}
                    />
                    <Button.IconLink render={<a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open stream link" variant="ghost" icon={<ExternalLink />} />
                  </div>
                </div>
              </>
            )}

            {drawer.meta.canViewStreamKey && stream.streamKey && (
              <>
                <Divider className="my-6" />
                <div className="px-4 space-y-3">
                  <Label.md>Stream setup (OBS / encoder)</Label.md>

                  <MetaRow icon={<Key />} label="Stream key">
                    <div className="flex items-center gap-1">
                      <Paragraph.xs className="font-mono truncate">{stream.streamKey}</Paragraph.xs>
                      <Button.Icon
                        aria-label="Copy stream key"
                        variant="ghost"
                        icon={drawer.state.copiedField === "key" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={drawer.actions.copyKey}
                      />
                    </div>
                  </MetaRow>

                  {stream.ingestionUrl && (
                    <MetaRow icon={<ExternalLink />} label="Server URL">
                      <div className="flex items-center gap-1">
                        <Paragraph.xs className="font-mono truncate">{stream.ingestionUrl}</Paragraph.xs>
                        <Button.Icon
                          aria-label="Copy server URL"
                          variant="ghost"
                          icon={drawer.state.copiedField === "ingestion" ? <Check className="text-utility-green-700" /> : <Copy />}
                          onClick={drawer.actions.copyIngestionUrl}
                        />
                      </div>
                    </MetaRow>
                  )}
                </div>
              </>
            )}
          </SplitPanel.Content>
    </>
  )
}
