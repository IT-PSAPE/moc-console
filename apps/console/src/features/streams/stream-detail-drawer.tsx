import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { RequestLinkField } from "@/features/request-links/request-link-field"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Section } from "@moc/ui/components/display/section"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel } from "@moc/types/streams/stream-constants"
import type { Stream } from "@moc/types/streams/stream"
import { latencyPreferenceLabel } from "@moc/types/streams/stream-constants"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar, Check, Code, Copy, ArrowSquareOut as OpenNewWindow, Eye, Gauge as DashboardSpeed, Key, Link, FilmStrip as MediaVideoList, ArrowsOut as Expand, Desktop as Computer, PencilSimple as EditPencil, Play, Square, Tag as LabelIcon, Trash, X as Xmark } from '@phosphor-icons/react'
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
  const showLinksSection = Boolean(stream.streamUrl) || (drawer.meta.canViewStreamKey && Boolean(stream.streamKey))

  return (
    <>
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close stream" variant="ghost" size="sm" icon={<Xmark weight="regular" />} onClick={drawer.actions.close} />
        <Button.Icon aria-label="Open full page" variant="ghost" size="sm" icon={<Expand />} onClick={drawer.actions.openFullPage} />
        <div className="flex-1" />
        {drawer.meta.canEdit && (
          <Button.Icon aria-label="Edit stream" variant="ghost" size="sm" icon={<EditPencil />} onClick={drawer.actions.edit} />
        )}
        {drawer.meta.canDelete && (
          <Button.Icon aria-label="Delete stream" variant="danger-secondary" size="sm" icon={<Trash />} onClick={drawer.actions.remove} />
        )}
      </SplitPanel.Header>

      <SplitPanel.Content>
        <div className="flex items-start gap-4 landscape:flex-col">
          {stream.thumbnailUrl && (
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              width="160"
              height="90"
              className="w-40 aspect-video shrink-0 rounded-lg border border-secondary object-cover landscape:w-full landscape:max-w-xs"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label.md className="truncate">{stream.title}</Label.md>
            <Badge dot label={streamStatusLabel[stream.streamStatus]} color={streamStatusColor[stream.streamStatus]} />
            <Paragraph.sm className="text-tertiary">{streamPrivacyLabel[stream.privacyStatus]}</Paragraph.sm>
            <Paragraph.sm className="text-tertiary">{formatDateTime(stream.scheduledStartTime)}</Paragraph.sm>
          </div>
        </div>

        <RequestLinkField kind="stream" id={stream.id} />

        <Section>
          <Section.Header title="Details" size="sm" />
          <Section.Body className="gap-3">
            <MetaRow icon={<Calendar />} label="Scheduled">
              <Paragraph.sm>{formatDateTime(stream.scheduledStartTime)}</Paragraph.sm>
            </MetaRow>

            {stream.actualStartTime && (
              <MetaRow icon={<Calendar />} label="Started">
                <Paragraph.sm>{formatDateTime(stream.actualStartTime)}</Paragraph.sm>
              </MetaRow>
            )}

            {stream.actualEndTime && (
              <MetaRow icon={<Calendar />} label="Ended">
                <Paragraph.sm>{formatDateTime(stream.actualEndTime)}</Paragraph.sm>
              </MetaRow>
            )}

            {stream.isForKids && (
              <MetaRow icon={<Eye />} label="Audience">
                <Paragraph.sm>Made for kids</Paragraph.sm>
              </MetaRow>
            )}

            <MetaRow icon={<DashboardSpeed />} label="Latency">
              <Paragraph.sm>{latencyPreferenceLabel[stream.latencyPreference]}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Computer />} label="DVR">
              <Paragraph.sm>{stream.enableDvr ? "Enabled" : "Disabled"}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Code />} label="Embedding">
              <Paragraph.sm>{stream.enableEmbed ? "Allowed" : "Disabled"}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Play />} label="Auto-start">
              <Paragraph.sm>{stream.enableAutoStart ? "On" : "Off"}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Square />} label="Auto-stop">
              <Paragraph.sm>{stream.enableAutoStop ? "On" : "Off"}</Paragraph.sm>
            </MetaRow>

            {stream.tags.length > 0 && (
              <MetaRow icon={<LabelIcon />} label="Tags">
                <div className="flex flex-wrap gap-1">
                  {stream.tags.map((tag) => (
                    <Badge key={tag} label={tag} />
                  ))}
                </div>
              </MetaRow>
            )}

            {stream.playlistId && (
              <MetaRow icon={<MediaVideoList />} label="Playlist">
                <Paragraph.sm className="truncate">{stream.playlistId}</Paragraph.sm>
              </MetaRow>
            )}
          </Section.Body>
        </Section>

        {showLinksSection && (
          <Section>
            <Section.Header title="Links & setup" size="sm" />
            <Section.Body className="gap-3">
              {stream.streamUrl && (
                <MetaRow icon={<Link />} label="YouTube link">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="min-w-0 flex-1 truncate text-tertiary">{stream.streamUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy stream link"
                      variant="ghost"
                      size="sm"
                      icon={drawer.state.copiedField === "url" ? <Check weight="regular" className="text-success" /> : <Copy />}
                      onClick={drawer.actions.copyUrl}
                    />
                    <Button.IconLink render={<a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open stream link" variant="ghost" size="sm" icon={<OpenNewWindow />} />
                  </div>
                </MetaRow>
              )}

              {drawer.meta.canViewStreamKey && stream.streamKey && (
                <MetaRow icon={<Key />} label="Stream key">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="font-mono truncate">{stream.streamKey}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy stream key"
                      variant="ghost"
                      size="sm"
                      icon={drawer.state.copiedField === "key" ? <Check weight="regular" className="text-success" /> : <Copy />}
                      onClick={drawer.actions.copyKey}
                    />
                  </div>
                </MetaRow>
              )}

              {drawer.meta.canViewStreamKey && stream.ingestionUrl && (
                <MetaRow icon={<OpenNewWindow />} label="Server URL">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="font-mono truncate">{stream.ingestionUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy server URL"
                      variant="ghost"
                      size="sm"
                      icon={drawer.state.copiedField === "ingestion" ? <Check weight="regular" className="text-success" /> : <Copy />}
                      onClick={drawer.actions.copyIngestionUrl}
                    />
                  </div>
                </MetaRow>
              )}
            </Section.Body>
          </Section>
        )}
        <ItemDiscussionPanel kind="stream" itemId={stream.id} />
      </SplitPanel.Content>
    </>
  )
}
