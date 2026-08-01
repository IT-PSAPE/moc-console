import { useParams } from "react-router-dom"
import { Header } from "@moc/ui/components/display/header"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { StreamModal } from "@/features/streams/stream-modal"
import { useStreamDetail } from "@/features/streams/use-stream-detail"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel, latencyPreferenceLabel } from "@moc/types/streams/stream-constants"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Page } from "@moc/ui/components/layout/page"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Calendar, Check, Code, Copy, ExternalLink, Eye, Gauge, Key, ListVideo, Loader, Monitor, Pencil, Play, Radio, Shield, Square, Tag, Trash2} from "lucide-react"

function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { state, actions, meta } = useStreamDetail(id)
  const { stream, isLoading, editOpen, deleteOpen, isDeleting, copiedField } = state

  useBreadcrumbOverride(id ?? "", stream?.title)
  useBreadcrumbOverride("stream", "Stream")

  function handleOpenEdit() {
    actions.setEditOpen(true)
  }

  function handleOpenDelete() {
    actions.setDeleteOpen(true)
  }

  if (isLoading) {
    return (
      <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
    )
  }

  if (!stream) {
    return (
      <Page><Page.Content width="standard">
        <EmptyState headingLevel="h1" icon={<Radio />} title="Stream not found" description="The stream you're looking for doesn't exist." />
      </Page.Content></Page>
    )
  }

  return (
    <DetailPage>
      <TopBarActions>
        {meta.canEdit && (
          <Button variant="secondary" icon={<Pencil />} onClick={handleOpenEdit}>Edit</Button>
        )}
        {meta.canDelete && (
          <Button.Icon aria-label="Delete stream" variant="danger-secondary" icon={<Trash2 />} onClick={handleOpenDelete} />
        )}
      </TopBarActions>

      {stream.thumbnailUrl && (
        <DetailPage.Section className="pb-0 pt-8">
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            width="640"
            height="360"
            className="w-full rounded-lg object-cover aspect-video border border-tertiary"
          />
        </DetailPage.Section>
      )}

      {/* Header */}
      <DetailPage.Header className="pt-8">
        <Header.Lead className="gap-2">
            <Page.Title>{stream.title}</Page.Title>
          {stream.description && (
            <Paragraph.sm className="text-tertiary">{stream.description}</Paragraph.sm>
          )}
        </Header.Lead>
      </DetailPage.Header>

      {/* Properties */}
      <DetailPage.Section>
        <div className="space-y-3">
          <MetaRow icon={<Loader />} label="Status">
            <Badge
              label={streamStatusLabel[stream.streamStatus]}
              color={streamStatusColor[stream.streamStatus]}
            />
          </MetaRow>

          <MetaRow icon={<Shield />} label="Privacy">
            <Paragraph.sm>{streamPrivacyLabel[stream.privacyStatus]}</Paragraph.sm>
          </MetaRow>

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
              <Paragraph.sm className="truncate">{stream.playlistId}</Paragraph.sm>
            </MetaRow>
          )}
        </div>
      </DetailPage.Section>

      {/* Playback */}
      <DetailPage.Divider />
      <DetailPage.Section>
        <Label.md className="block pb-3">Playback</Label.md>
        <div className="space-y-3">
          <MetaRow icon={<Gauge />} label="Latency">
            <Paragraph.sm>{latencyPreferenceLabel[stream.latencyPreference]}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Monitor />} label="DVR">
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
        </div>
      </DetailPage.Section>

      {/* YouTube Link */}
      {stream.streamUrl && (
        <>
          <DetailPage.Divider />
          <DetailPage.Section>
            <Label.md className="block pb-3">YouTube link</Label.md>
            <div className="flex items-center gap-2">
              <Paragraph.sm className="text-tertiary truncate flex-1">{stream.streamUrl}</Paragraph.sm>
              <Button.Icon
                aria-label="Copy stream link"
                variant="ghost"
                icon={copiedField === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
                onClick={actions.copyStreamUrl}
              />
              <Button.IconLink render={<a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open stream link" variant="ghost" icon={<ExternalLink />} />
            </div>
          </DetailPage.Section>
        </>
      )}

      {/* Stream Setup */}
      {meta.canViewStreamKey && stream.streamKey && (
        <>
          <DetailPage.Divider />
          <DetailPage.Section>
            <Label.md className="block pb-3">Stream setup (OBS / encoder)</Label.md>
            <div className="space-y-3">
              <MetaRow icon={<Key />} label="Stream key">
                <div className="flex items-center gap-1 min-w-0">
                  <Paragraph.sm className="font-mono truncate">{stream.streamKey}</Paragraph.sm>
                  <Button.Icon
                    aria-label="Copy stream key"
                    variant="ghost"
                    icon={copiedField === "key" ? <Check className="text-utility-green-700" /> : <Copy />}
                    onClick={actions.copyStreamKey}
                  />
                </div>
              </MetaRow>

              {stream.ingestionUrl && (
                <MetaRow icon={<ExternalLink />} label="Server URL">
                  <div className="flex items-center gap-1 min-w-0">
                    <Paragraph.sm className="font-mono truncate">{stream.ingestionUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy server URL"
                      variant="ghost"
                      icon={copiedField === "ingestion" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={actions.copyIngestionUrl}
                    />
                  </div>
                </MetaRow>
              )}
            </div>
          </DetailPage.Section>
        </>
      )}

      <StreamModal
        open={editOpen}
        onOpenChange={actions.setEditOpen}
        onSubmit={actions.update}
        stream={stream}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={actions.setDeleteOpen}
        title="Delete stream?"
        description="This also removes the broadcast from YouTube. This action cannot be undone."
        confirmLabel="Delete stream"
        isConfirming={isDeleting}
        onConfirm={actions.remove}
      />
    </DetailPage>
  )
}
